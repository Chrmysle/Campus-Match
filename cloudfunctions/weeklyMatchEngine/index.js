// cloudfunctions/weeklyMatchEngine/index.js
// 每周一 21:00 Cron 触发：运行匹配算法，生成 match_pool
// 使用 weekly_preferences 的 vibeTypes 做硬过滤 + 子类别做加分
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const weekLabel = getWeekLabel();
  console.log('[weeklyMatchEngine] 开始本周匹配:', weekLabel);

  try {
    // 1. 迁移旧周期记录到 history（幂等）
    await archiveOldPools(weekLabel);

    // 2. 获取所有 active 用户
    const { data: users } = await db.collection('users')
      .where({ userStatus: 'normal', isVerified: true })
      .get();
    console.log('[weeklyMatchEngine] 活跃用户数:', users.length);

    // 3. 获取所有用户本周偏好
    var weeklyPrefsMap = {};
    const { data: weeklyPrefs } = await db.collection('weekly_preferences')
      .where({ weekLabel: weekLabel })
      .get();
    weeklyPrefs.forEach(function (wp) {
      weeklyPrefsMap[wp.userId] = wp;
    });
    console.log('[weeklyMatchEngine] 本周偏好数:', weeklyPrefs.length);

    // 4. 为每个用户生成匹配池
    let totalCandidates = 0;
    for (const user of users) {
      const candidates = await generateCandidates(user, users, weeklyPrefsMap);
      if (candidates.length > 0) {
        await db.collection('match_pool').add({
          data: {
            weekLabel,
            userId: user._id,
            candidates,
            revealed: false,
            completedSelection: false,
            createdAt: new Date()
          }
        });
        // 标记该用户处于"投票中"状态
        await db.collection('users').doc(user._id).update({
          data: {
            weeklyMatchStatus: 'voting',
            weeklyMatchWeekLabel: weekLabel
          }
        });
        totalCandidates += candidates.length;
      } else {
        // 没有候选人时也标记为 completed，避免用户空等
        await db.collection('users').doc(user._id).update({
          data: {
            weeklyMatchStatus: 'completed',
            weeklyMatchWeekLabel: weekLabel
          }
        });
      }
    }

    console.log('[weeklyMatchEngine] 匹配完成，总候选人数:', totalCandidates);

    // 5. 触发通知云函数
    await cloud.callFunction({ name: 'sendWeeklyNotify', data: { weekLabel } });

    return { success: true, weekLabel, usersMatched: users.length, totalCandidates };
  } catch (err) {
    console.error('[weeklyMatchEngine] 错误:', err);
    return { success: false, error: err.message };
  }
};

/**
 * 硬过滤：校区 + 作息 + 性别偏好 + 搭子类型（使用 weeklyPref vibeTypes）
 */
function hardFilter(user, candidate, userWeeklyPref) {
  if (user._id === candidate._id) return false;
  if (user.campus !== candidate.campus) return false;
  if (user.schedule !== candidate.schedule) return false;

  // 从本周偏好中读取 vibeTypes 数组，回退到用户的 targetVibe
  var vibeTypes = null;
  if (userWeeklyPref && userWeeklyPref.vibeTypes && userWeeklyPref.vibeTypes.length > 0) {
    vibeTypes = userWeeklyPref.vibeTypes.map(function (v) { return v.value; });
  } else {
    vibeTypes = [user.targetVibe || 'study'];
  }

  // 候选人的 targetVibe 必须在用户选择的 vibeTypes 中
  if (!vibeTypes.includes(candidate.targetVibe)) return false;

  var pref = user.genderPreference || { type: 'any' };
  if (pref.type === 'same' && candidate.gender !== user.gender) return false;
  if (pref.type === 'opposite' && candidate.gender === user.gender) return false;
  if (pref.type === 'specific' && pref.targetGenders && pref.targetGenders.length > 0) {
    if (!pref.targetGenders.includes(candidate.gender)) return false;
  }

  return true;
}

/**
 * 软权重计算：大五人格 + 标签交集 + 子类别重叠加分
 */
function calculateScore(userA, userB, prefA, prefB) {
  let score = 50; // base

  // 大五人格余弦相似度
  const bfA = (userA.quantitativeScores && userA.quantitativeScores.bigFive) || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };
  const bfB = (userB.quantitativeScores && userB.quantitativeScores.bigFive) || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };
  const keys = ['N', 'E', 'O', 'A', 'C'];
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(function (k) {
    dot += bfA[k] * bfB[k];
    magA += bfA[k] * bfA[k];
    magB += bfB[k] * bfB[k];
  });
  const cosSim = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  score += cosSim * 25;

  // 标签交集加权
  const tagsA = new Set((userA.displayTags || []).map(function (t) { return t.key; }));
  const tagsB = new Set((userB.displayTags || []).map(function (t) { return t.key; }));
  const shared = [];
  tagsA.forEach(function (t) { if (tagsB.has(t)) shared.push(t); });
  score += shared.length * 8;

  // 子类别重叠加分（最多 +15）
  if (prefA && prefB && prefA.subCategories && prefB.subCategories) {
    var sharedSubs = 0;
    Object.keys(prefA.subCategories).forEach(function (vibeKey) {
      var subsA = prefA.subCategories[vibeKey] || [];
      var subsB = prefB.subCategories[vibeKey] || [];
      subsA.forEach(function (sa) {
        if (subsB.some(function (sb) { return sb.value === sa.value; })) {
          sharedSubs++;
        }
      });
    });
    score += Math.min(sharedSubs * 5, 15);
  }

  return Math.min(100, Math.round(score));
}

function getHighlightTags(userA, userB) {
  const tagsA = userA.displayTags || [];
  const bKeys = new Set((userB.displayTags || []).map(function (t) { return t.key; }));
  return tagsA.filter(function (t) { return bKeys.has(t.key); });
}

/**
 * 获取两个用户的共享子类别标签
 */
function getSharedSubCategories(prefA, prefB) {
  var result = [];
  if (!prefA || !prefB || !prefA.subCategories || !prefB.subCategories) return result;

  Object.keys(prefA.subCategories).forEach(function (vibeKey) {
    var subsA = prefA.subCategories[vibeKey] || [];
    var subsB = prefB.subCategories[vibeKey] || [];
    subsA.forEach(function (sa) {
      if (subsB.some(function (sb) { return sb.value === sa.value; })) {
        result.push({ value: sa.value, label: sa.label, emoji: sa.emoji || '' });
      }
    });
  });
  return result;
}

/**
 * 获取共享标签文本
 */
function getSharedTagsText(highlightTags) {
  return highlightTags.map(function (t) { return t.label; }).join('、') || '基础匹配';
}

async function generateCandidates(user, allUsers, weeklyPrefsMap) {
  // 排除已交互过的用户
  const { data: actions } = await db.collection('match_actions')
    .where({ fromUser: user._id }).get();
  const interactedIds = new Set(actions.map(function (a) { return a.toUser; }));

  const { data: relationships } = await db.collection('relationships')
    .where(_.or([{ userA: user._id }, { userB: user._id }])).get();
  relationships.forEach(function (r) {
    interactedIds.add(r.userA === user._id ? r.userB : r.userA);
  });

  const { data: blacklists } = await db.collection('blacklists')
    .where(_.or([{ blocker: user._id }, { blocked: user._id }])).get();
  blacklists.forEach(function (b) {
    interactedIds.add(b.blocker === user._id ? b.blocked : b.blocker);
  });

  // 用户自己的本周偏好
  var userPref = weeklyPrefsMap[user._id] || null;

  const filtered = allUsers.filter(function (c) {
    return hardFilter(user, c, userPref) && !interactedIds.has(c._id);
  });

  const scored = filtered.map(function (c) {
    var cP = weeklyPrefsMap[c._id] || null;
    const score = calculateScore(user, c, userPref, cP);
    const highlightTags = getHighlightTags(user, c);
    const sharedSubCategories = getSharedSubCategories(userPref, cP);
    return {
      candidateId: c._id,
      score,
      highlightTags: highlightTags,
      sharedTags: getSharedTagsText(highlightTags),
      sharedSubCategories: sharedSubCategories,
      scheduleSync: user.schedule === c.schedule,
      campusLink: user.campus === c.campus,
      // 可选：包含用户展示信息快照，减少后续查询
      name: c.name || '',
      avatar: c.avatar || '',
      campus: c.campus || '',
      scheduleLabel: c.scheduleLabel || '',
      aiSummary: c.aiSummary || ''
    };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  // 所有搭子类型最多 3 人
  return scored.slice(0, 3);
}

async function archiveOldPools(currentWeekLabel) {
  const { data: oldPools } = await db.collection('match_pool')
    .where({ weekLabel: _.neq(currentWeekLabel) }).get();
  if (oldPools.length > 0) {
    for (const pool of oldPools) {
      await db.collection('match_pool_history').add({ data: pool });
    }
    await db.collection('match_pool')
      .where({ weekLabel: _.neq(currentWeekLabel) }).remove();
  }
}

function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return year + 'W' + String(weekNum).padStart(2, '0');
}