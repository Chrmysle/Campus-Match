// cloudfunctions/generateAiSummary/index.js
// 用户提交问卷后触发，调用大模型生成 AI 微名片摘要
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, quizData, bio } = event;

  if (!userId) {
    return { success: false, error: '缺少 userId' };
  }

  console.log('[generateAiSummary] 为用户生成摘要:', userId);

  try {
    let aiSummary = '';

    // 尝试调用大模型
    try {
      const response = await cloud.openapi.ai.createChatCompletion({
        model: 'deepseek-v4-flash',
        messages: [{
          role: 'user',
          content: `请根据以下用户问卷和自我介绍，生成一段50字以内的校园社交摘要，要求网感强、有emoji点缀：\n问卷数据：${JSON.stringify(quizData)}\n自我介绍：${bio || '无'}`
        }],
        max_tokens: 120,
        temperature: 0.7
      });
      aiSummary = response.choices?.[0]?.message?.content?.trim() || '';
    } catch (aiErr) {
      console.warn('[generateAiSummary] AI接口调用失败，使用降级方案:', aiErr.message);
      aiSummary = generateFallbackSummary(quizData);
    }

    // 写入用户表
    await db.collection('users').doc(userId).update({
      data: {
        aiSummary: aiSummary || generateFallbackSummary(quizData),
        updatedAt: new Date()
      }
    });

    console.log('[generateAiSummary] 摘要已写入:', aiSummary);
    return { success: true, aiSummary };
  } catch (err) {
    console.error('[generateAiSummary] 错误:', err);
    return { success: false, error: err.message };
  }
};

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