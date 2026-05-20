// cloudfunctions/generateAiSummary/index.js
// 用户提交问卷后触发，调用 DeepSeek API 生成 AI 微名片摘要
// 同时分析用户自由文本（e2）微调大五人格向量
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const https = require('https');

exports.main = async (event, context) => {
  const { userId, quizData, bio } = event;

  if (!userId) {
    return { success: false, error: '缺少 userId' };
  }

  console.log('[generateAiSummary] 为用户生成摘要:', userId);

  try {
    let aiSummary = '';
    let adjustments = null;

    // 尝试调用 DeepSeek API
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      console.log('[generateAiSummary] DEEPSEEK_API_KEY 是否配置:', !!apiKey, apiKey ? '长度=' + apiKey.length : '');
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY 未配置');
      }

      const prompt = `你是一位人格分析专家。请根据用户的问卷数据和自我介绍完成两项任务。

TASK 1 - 微名片摘要：生成一段50字以内的校园社交摘要，要求网感强、有emoji点缀。

TASK 2 - 人格微调：分析自我介绍的文字语气，判断是否需要微调大五人格维度（N=神经质, E=外向性, O=开放性, A=宜人性, C=尽责性）。
- 每项调整幅度为 -10 到 +10（表示加减10分）
- 仅在文字中有明确暗示时才调整，没有把握时设置为0
- 例如说"喜欢安静独处" → E-5，"做事一丝不苟" → C+8，"随缘就好" → C-5，"喜欢探索新事物" → O+6

请严格按以下格式返回，不要包含其他内容：
---SUMMARY---
<摘要内容>
---ADJUST---
N:调整值 E:调整值 O:调整值 A:调整值 C:调整值

问卷数据：${JSON.stringify(quizData)}
自我介绍：${bio || '无'}`;

      const result = await callDeepSeek(apiKey, prompt);
      console.log('[generateAiSummary] DeepSeek原始响应:', result.slice(0, 300));

      // 解析摘要
      const summaryMatch = result.match(/---SUMMARY---\n?([\s\S]*?)\n?---ADJUST---/);
      aiSummary = summaryMatch ? summaryMatch[1].trim() : result;

      // 解析调整值
      const adjustMatch = result.match(/---ADJUST---\n?([\s\S]*)/);
      if (adjustMatch) {
        adjustments = {};
        const parts = adjustMatch[1].trim().split(/\s+/);
        parts.forEach(function (p) {
          const kv = p.split(':');
          const key = kv[0].trim();
          const val = parseInt(kv[1]) || 0;
          if (['N', 'E', 'O', 'A', 'C'].includes(key)) {
            adjustments[key] = val;
          }
        });
        console.log('[generateAiSummary] 解析到人格调整:', adjustments);
      }
    } catch (aiErr) {
      console.warn('[generateAiSummary] AI接口调用失败，使用降级方案:', aiErr.message);
      aiSummary = generateFallbackSummary(quizData);
    }

    // 应用人格微调
    var finalBigFive = null;
    if (adjustments && quizData && quizData.bigFive) {
      finalBigFive = {};
      var hasChange = false;
      Object.keys(quizData.bigFive).forEach(function (k) {
        // bigFive 是 0-1 标准化值，adjustment 是 -10 到 +10，对应 ±0.10
        var delta = (adjustments[k] || 0) / 100;
        var adjusted = (quizData.bigFive[k] ?? 0.5) + delta;
        finalBigFive[k] = Math.max(0, Math.min(2, adjusted));
        if (delta !== 0) hasChange = true;
      });
      if (!hasChange) finalBigFive = null;
    }

    if (finalBigFive) {
      console.log('[generateAiSummary] bigFive调整:', JSON.stringify(quizData.bigFive), '→', JSON.stringify(finalBigFive));
    }

    // 写入用户表
    var updateData = {
      aiSummary: aiSummary || generateFallbackSummary(quizData),
      updatedAt: new Date()
    };

    if (finalBigFive) {
      updateData.bigFive = finalBigFive;
      // 同步更新 quantitativeScores（匹配引擎读取此字段）
      updateData['quantitativeScores.bigFive'] = finalBigFive;
    }

    await db.collection('users').doc(userId).update({ data: updateData });

    console.log('[generateAiSummary] 摘要已写入:', aiSummary);
    return { success: true, aiSummary: updateData.aiSummary, adjustments };
  } catch (err) {
    console.error('[generateAiSummary] 错误:', err);
    return { success: false, error: err.message };
  }
};

function callDeepSeek(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'deepseek-v3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      console.log('[DeepSeek] 响应状态码:', res.statusCode);
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('[DeepSeek] 原始响应体:', body.slice(0, 500));
        try {
          const json = JSON.parse(body);
          // 检查 API 返回的错误
          if (json.error) {
            reject(new Error('DeepSeek API错误: ' + JSON.stringify(json.error)));
            return;
          }
          const text = json.choices?.[0]?.message?.content?.trim() || '';
          resolve(text);
        } catch (e) {
          reject(new Error('解析响应失败: ' + body.slice(0, 200)));
        }
      });
    });

    req.on('error', (e) => {
      console.error('[DeepSeek] 网络错误:', e.message);
      reject(e);
    });
    req.write(data);
    req.end();
  });
}

// 降级方案：基于问卷数据规则生成摘要
function generateFallbackSummary(quizData) {
  if (!quizData) return '✨ 校园新搭子，期待遇见同频的你！';

  const vibeMap = { study: '📚 学术', game: '🎮 游戏', fitness: '💪 运动', entertainment: '🍜 娱乐' };
  const schedMap = { earlyBird: '🦅 早起', nightOwl: '🦉 夜猫', dayWalker: '☀️ 规律' };

  const vibe = vibeMap[quizData.vibeType] || '校园';
  const sched = schedMap[quizData.schedule] || '';

  const tagCount = (quizData.tags || []).length;

  return `✨ ${sched}作息的${vibe}达人，${tagCount}个趣味标签等你来发现~`;
}