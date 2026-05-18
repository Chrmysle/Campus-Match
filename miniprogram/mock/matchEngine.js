// mock/matchEngine.js — 本地模拟匹配引擎
// 模拟 weeklyMatchEngine 云函数的匹配算法

const MOCK_USERS = require('./data').MOCK_USERS;
const MOCK_WEEKLY_PREFS = require('./data').MOCK_WEEKLY_PREFS;

/**
 * 硬过滤：校区 + 作息 + 性别偏好 + 目标搭子类型
 */
function hardFilter(currentUser, candidates, weeklyPref) {
  // 从本周偏好中获取搭子类型，回退到用户画像中的 targetVibe
  var vibeTypes = null;
  if (weeklyPref && weeklyPref.vibeTypes) {
    vibeTypes = weeklyPref.vibeTypes.map(function (v) { return v.value; });
  } else {
    vibeTypes = currentUser.vibeTypes || [currentUser.targetVibe || 'study'];
  }

  return candidates.filter(c => {
    if (c._id === currentUser._id) return false;
    if (c.campus !== currentUser.campus) return false;
    if (c.schedule !== currentUser.schedule) return false;

    // 候选人的 targetVibe 在用户选择了的任一类型中即可
    if (!vibeTypes.includes(c.targetVibe)) return false;

    var pref = currentUser.genderPreference || { type: 'any' };
    if (pref.type === 'same' && c.gender !== currentUser.gender) return false;
    if (pref.type === 'opposite' && c.gender === currentUser.gender) return false;
    if (pref.type === 'specific' && pref.targetGenders && !pref.targetGenders.includes(c.gender)) return false;

    return true;
  });
}

/**
 * 软权重计算：大五人格 + 标签交集 + 子类别重叠加分
 */
function calculateSoftScore(userA, userB, weeklyPrefA, weeklyPrefB) {
  let score = 50; // base

  // 大五人格余弦相似度（简化为向量点积）
  const bfA = userA.quantitativeScores?.bigFive || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };
  const bfB = userB.quantitativeScores?.bigFive || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };
  const keys = ['N', 'E', 'O', 'A', 'C'];
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(k => {
    dot += bfA[k] * bfB[k];
    magA += bfA[k] * bfA[k];
    magB += bfB[k] * bfB[k];
  });
  const cosSim = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  score += cosSim * 25;

  // 标签交集加权（感知相似性 > 客观距离）
  const tagsA = new Set((userA.displayTags || []).map(t => t.key));
  const tagsB = new Set((userB.displayTags || []).map(t => t.key));
  const shared = [...tagsA].filter(t => tagsB.has(t));
  score += shared.length * 8;

  // 子类别重叠加分（最多 +15）
  if (weeklyPrefA && weeklyPrefB && weeklyPrefA.subCategories && weeklyPrefB.subCategories) {
    var sharedSubs = 0;
    Object.keys(weeklyPrefA.subCategories).forEach(function (vibeKey) {
      var subsA = weeklyPrefA.subCategories[vibeKey] || [];
      var subsB = weeklyPrefB.subCategories[vibeKey] || [];
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

/**
 * 生成高光标签（共享标签交集）
 */
function getHighlightTags(userA, userB) {
  const tagsA = userA.displayTags || [];
  const tagsB = userB.displayTags || [];
  const bKeys = new Set(tagsB.map(t => t.key));
  return tagsA.filter(t => bKeys.has(t.key));
}

/**
 * 生成共享标签文本
 */
function getSharedTagsText(highlightTags) {
  return highlightTags.map(t => t.label).join('、') || '基础匹配';
}

/**
 * 运行完整匹配流程
 * @param {Object} currentUser - 当前用户
 * @param {Array} poolCandidates - 候选池
 * @param {Object} weeklyPref - 当前用户的本周偏好（可选）
 * @param {Object} allWeeklyPrefs - 所有用户的本周偏好（可选，keyed by userId）
 * @returns {Array} 匹配候选人列表
 */
function runMatch(currentUser, poolCandidates, weeklyPref, allWeeklyPrefs) {
  const filtered = hardFilter(currentUser, poolCandidates, weeklyPref);
  console.log('[matchEngine] hardFilter:', poolCandidates.length, '→', filtered.length);

  const scored = filtered.map(c => {
    const cPref = (allWeeklyPrefs && allWeeklyPrefs[c._id]) || null;
    const score = calculateSoftScore(currentUser, c, weeklyPref, cPref);
    const highlightTags = getHighlightTags(currentUser, c);

    // 计算共享子类别
    var sharedSubCategories = [];
    if (weeklyPref && cPref && weeklyPref.subCategories && cPref.subCategories) {
      Object.keys(weeklyPref.subCategories).forEach(function (vibeKey) {
        var subsA = weeklyPref.subCategories[vibeKey] || [];
        var subsB = cPref.subCategories[vibeKey] || [];
        subsA.forEach(function (sa) {
          if (subsB.some(function (sb) { return sb.value === sa.value; })) {
            sharedSubCategories.push({ value: sa.value, label: sa.label, emoji: sa.emoji || '' });
          }
        });
      });
    }

    return {
      candidateId: c._id,
      score,
      highlightTags,
      sharedTags: getSharedTagsText(highlightTags),
      sharedSubCategories: sharedSubCategories,
      scheduleSync: currentUser.schedule === c.schedule,
      campusLink: currentUser.campus === c.campus,
      name: c.name,
      avatar: c.avatar,
      campus: c.campus,
      scheduleLabel: c.scheduleLabel,
      aiSummary: c.aiSummary,
      voted: null
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3);
}

/**
 * 双向匹配判定
 * actionA: A对B的选择, actionB: B对A的选择
 * 规则：
 *  - 双方均为 HEART 或 MEET → 匹配成功
 *  - 一方 HEART 一方 MEET → 匹配成功
 *  - 任意一方 PASS → 匹配失败
 */
function checkBidirectionalMatch(actionA, actionB) {
  if (!actionA || !actionB) return false;
  if (actionA === 'PASS' || actionB === 'PASS') return false;
  return true;
}

module.exports = {
  hardFilter,
  calculateSoftScore,
  getHighlightTags,
  runMatch,
  checkBidirectionalMatch,
  MOCK_USERS
};