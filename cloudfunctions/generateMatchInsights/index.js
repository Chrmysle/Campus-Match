// cloudfunctions/generateMatchInsights/index.js
// 懒加载：为用户生成匹配解读（为什么匹配 + 相似点 + 破冰锦囊）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const https = require('https');

const FACET_LIST = [
  'N_Anxiety', 'N_Vulnerability', 'N_Impulsiveness',
  'E_Gregariousness', 'E_Assertiveness', 'E_Warmth',
  'O_Ideas', 'O_Actions', 'O_Aesthetics',
  'A_Trust', 'A_Altruism', 'A_Compliance',
  'C_Order', 'C_Achievement', 'C_SelfDiscipline'
];

const FACET_LABELS = {
  N_Anxiety: '焦虑', N_Vulnerability: '脆弱', N_Impulsiveness: '冲动',
  E_Gregariousness: '合群', E_Assertiveness: '主见', E_Warmth: '热情',
  O_Ideas: '求是', O_Actions: '探索', O_Aesthetics: '审美',
  A_Trust: '信任', A_Altruism: '利他', A_Compliance: '顺从',
  C_Order: '条理', C_Achievement: '上进', C_SelfDiscipline: '自律'
};

exports.main = async (event, context) => {
  const { userId, candidateId, weekLabel } = event;

  if (!userId || !candidateId) {
    return { success: false, error: '缺少参数' };
  }

  console.log('[generateMatchInsights] 生成匹配解读:', userId, '<->', candidateId);

  try {
    // 1. 并行读取双方数据
    const [userRes, candidateRes, prefRes, candidatePrefRes] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(candidateId).get(),
      db.collection('weekly_preferences').where({ userId, weekLabel }).limit(1).get(),
      db.collection('weekly_preferences').where({ userId: candidateId, weekLabel }).limit(1).get()
    ]);

    const user = userRes.data;
    const candidate = candidateRes.data;

    if (!user || !candidate) {
      return { success: false, error: '用户不存在' };
    }

    const userPref = prefRes.data[0] || null;
    const candidatePref = candidatePrefRes.data[0] || null;

    // 2. 计算人格相似度信息
    const bfA = (user.quantitativeScores && user.quantitativeScores.bigFiveFacets) || {};
    const bfB = (candidate.quantitativeScores && candidate.quantitativeScores.bigFiveFacets) || {};

    // 余弦相似度
    let dot = 0, magA = 0, magB = 0;
    FACET_LIST.forEach(function (k) {
      var va = bfA[k] !== undefined ? bfA[k] : 0.5;
      var vb = bfB[k] !== undefined ? bfB[k] : 0.5;
      dot += va * vb;
      magA += va * va;
      magB += vb * vb;
    });
    const cosSim = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);

    // 找出差异最小的 top-3 层面
    var facetDiffs = FACET_LIST.map(function (k) {
      var va = bfA[k] !== undefined ? bfA[k] : 0.5;
      var vb = bfB[k] !== undefined ? bfB[k] : 0.5;
      return { key: k, label: FACET_LABELS[k] || k, diff: Math.abs(va - vb), va: va, vb: vb };
    });
    facetDiffs.sort(function (a, b) { return a.diff - b.diff; });
    var topFacets = facetDiffs.slice(0, 3);

    // 共享标签
    var userTags = (user.displayTags || []).map(function (t) { return t.label || t.key || t; });
    var candTags = (candidate.displayTags || []).map(function (t) { return t.label || t.key || t; });
    var sharedTags = userTags.filter(function (t) { return candTags.indexOf(t) !== -1; });

    // 共享子类别
    var sharedSubs = [];
    if (userPref && candidatePref && userPref.subCategories && candidatePref.subCategories) {
      Object.keys(userPref.subCategories).forEach(function (vibeKey) {
        var subsA = userPref.subCategories[vibeKey] || [];
        var subsB = candidatePref.subCategories[vibeKey] || [];
        subsA.forEach(function (sa) {
          if (subsB.some(function (sb) { return sb.value === sa.value; })) {
            sharedSubs.push(sa.label || sa.value);
          }
        });
      });
    }

    // 作息/校区同步
    var schedSync = user.schedule === candidate.schedule;
    var campusSync = user.campus === candidate.campus;

    // 3. 尝试 AI 生成
    var matchReason = '';
    var aiUsed = false;

    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

      // 人格数据描述
      var userPersonalityDesc = topFacets.map(function (f) {
        return f.label + '=' + (f.va > 0.6 ? '较高' : f.va < 0.4 ? '较低' : '中等') + '(' + Math.round(f.va * 100) + '%)';
      }).join('、');

      var candPersonalityDesc = topFacets.map(function (f) {
        return f.label + '=' + (f.vb > 0.6 ? '较高' : f.vb < 0.4 ? '较低' : '中等') + '(' + Math.round(f.vb * 100) + '%)';
      }).join('、');

      var sharedTagsText = sharedTags.length > 0 ? sharedTags.join('、') : '无';
      var sharedSubsText = sharedSubs.length > 0 ? sharedSubs.join('、') : '无';

      const prompt = '你是一位校园社交匹配分析师。根据以下两人的数据，生成一段匹配解读。要求：\n' +
        '1. 为什么匹配（2-3句话，解释人格契合度和兴趣共同点）\n' +
        '2. 两个破冰话题建议（针对他们的共同兴趣）\n' +
        '用户A（当前用户）：' + userPersonalityDesc + '\n' +
        '用户B（匹配对象）：' + candPersonalityDesc + '\n' +
        '人格余弦相似度：' + Math.round(cosSim * 100) + '%\n' +
        '共同标签：' + sharedTagsText + '\n' +
        '共同活动：' + sharedSubsText + '\n' +
        '作息：' + (schedSync ? '同步' : '不同步') + '，校区：' + (campusSync ? '同校区' : '不同校区') + '\n\n' +
        '请按以下格式返回，不要包含其他内容：\n' +
        '---REASON---\n' +
        '<为什么匹配的文案>\n' +
        '---ICEBREAKER1---\n' +
        '<第一个破冰话题>\n' +
        '---ICEBREAKER2---\n' +
        '<第二个破冰话题>';

      const result = await callDeepSeek(apiKey, prompt);
      console.log('[generateMatchInsights] AI响应:', result.slice(0, 300));

      // 解析
      var reasonMatch = result.match(/---REASON---\n?([\s\S]*?)\n?---ICEBREAKER1---/);
      var ice1Match = result.match(/---ICEBREAKER1---\n?([\s\S]*?)\n?---ICEBREAKER2---/);
      var ice2Match = result.match(/---ICEBREAKER2---\n?([\s\S]*)/);

      if (reasonMatch) {
        matchReason = reasonMatch[1].trim();
        aiUsed = true;
      }

      var iceBreakers = [];
      if (ice1Match) iceBreakers.push(ice1Match[1].trim());
      if (ice2Match) iceBreakers.push(ice2Match[1].trim());

      var insight = {
        matchReason: matchReason || generateFallbackReason(cosSim, topFacets),
        similarities: {
          personality: generateSimilarityText(cosSim, topFacets),
          tags: sharedTags,
          subCategories: sharedSubs,
          scheduleSync: schedSync,
          campusLink: campusSync
        },
        iceBreakers: iceBreakers.length >= 2 ? iceBreakers : generateFallbackIceBreakers(sharedTags, sharedSubs),
        aiGenerated: aiUsed
      };

      // 4. 缓存到 match_pool
      try {
        await cacheInsight(userId, candidateId, weekLabel, insight);
      } catch (cacheErr) {
        console.warn('[generateMatchInsights] 缓存失败（不影响返回）:', cacheErr.message);
      }

      return { success: true, insight };

    } catch (aiErr) {
      console.warn('[generateMatchInsights] AI失败，使用降级方案:', aiErr.message);

      var insight = {
        matchReason: generateFallbackReason(cosSim, topFacets),
        similarities: {
          personality: generateSimilarityText(cosSim, topFacets),
          tags: sharedTags,
          subCategories: sharedSubs,
          scheduleSync: schedSync,
          campusLink: campusSync
        },
        iceBreakers: generateFallbackIceBreakers(sharedTags, sharedSubs),
        aiGenerated: false
      };

      try {
        await cacheInsight(userId, candidateId, weekLabel, insight);
      } catch (cacheErr) {}

      return { success: true, insight };
    }
  } catch (err) {
    console.error('[generateMatchInsights] 错误:', err);
    return { success: false, error: err.message };
  }
};

function callDeepSeek(apiKey, prompt) {
  return new Promise(function (resolve, reject) {
    const data = JSON.stringify({
      model: 'deepseek-v3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
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
    var req = https.request(options, function (res) {
      var body = '';
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        try {
          var json = JSON.parse(body);
          if (json.error) { reject(new Error('API错误: ' + JSON.stringify(json.error))); return; }
          var text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          resolve(text ? text.trim() : '');
        } catch (e) { reject(new Error('解析失败: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function generateFallbackReason(cosSim, topFacets) {
  var pct = Math.round(cosSim * 100);
  var topText = topFacets.slice(0, 2).map(function (f) { return f.label; }).join('、');
  return '人格契合度 ' + pct + '%，尤其在 ' + topText + ' 等层面高度同步。加上共同的兴趣爱好，算法推荐你们成为本周搭子！';
}

function generateSimilarityText(cosSim, topFacets) {
  var pct = Math.round(cosSim * 100);
  var topText = topFacets.map(function (f) { return f.label; }).join('、');
  return '你们的大五人格余弦相似度为 ' + pct + '%，在 ' + topText + ' 等层面契合度最高。';
}

function generateFallbackIceBreakers(sharedTags, sharedSubs) {
  var result = [];
  if (sharedTags.length > 0) {
    result.push('你们都有「' + sharedTags.slice(0, 2).join('」、「') + '」的标签，不妨从共同兴趣聊起！');
  }
  if (sharedSubs.length > 0) {
    result.push('发现你们都关注「' + sharedSubs.slice(0, 2).join('」、「') + '」，约起来吧！');
  }
  if (result.length === 0) {
    result.push('缘分让你们相遇，主动打个招呼开启一段新友谊吧 ✨');
    result.push('分享一首你最近在循环的歌，看看对方是否也喜欢 💫');
  }
  if (result.length < 2) {
    result.push('分享一首你最近在循环的歌，看看对方是否也喜欢 💫');
  }
  return result.slice(0, 2);
}

async function cacheInsight(userId, candidateId, weekLabel, insight) {
  var { data: pools } = await db.collection('match_pool')
    .where({ userId, weekLabel })
    .limit(1)
    .get();
  if (pools.length === 0) return;
  var pool = pools[0];
  var idx = -1;
  for (var i = 0; i < (pool.candidates || []).length; i++) {
    if (pool.candidates[i].candidateId === candidateId) { idx = i; break; }
  }
  if (idx === -1) return;
  var updateKey = 'candidates.' + idx + '.matchInsight';
  await db.collection('match_pool').doc(pool._id).update({
    data: (function () { var o = {}; o[updateKey] = insight; return o; })()
  });
  console.log('[generateMatchInsights] 已缓存到 match_pool');
}