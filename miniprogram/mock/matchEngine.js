// mock/matchEngine.js — 匹配算法（与 weeklyMatchEngine 云函数同步）
// 用于本地开发测试，实时数据由云端引擎生成

/**
 * 硬过滤：校区 + 性别偏好 + 搭子类型
 */
function hardFilter(currentUser, candidates, weeklyPref) {
  var vibeTypes = null;
  if (weeklyPref && weeklyPref.vibeTypes) {
    vibeTypes = weeklyPref.vibeTypes.map(function (v) { return v.value; });
  } else {
    vibeTypes = currentUser.vibeTypes || [currentUser.targetVibe || 'study'];
  }

  return candidates.filter(c => {
    if (c._id === currentUser._id) return false;
    if (c.campus !== currentUser.campus) return false;

    var candidateVibe = c.targetVibe;
    if (!candidateVibe && c.vibeTypes && c.vibeTypes.length > 0) {
      candidateVibe = c.vibeTypes[0];
    }
    if (!candidateVibe) candidateVibe = 'study';
    if (!vibeTypes.includes(candidateVibe)) return false;

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
  let score = 40; // 基础分

  var expectation = 50;
  if (weeklyPrefA && weeklyPrefA.additionalPrefs && weeklyPrefA.additionalPrefs.expectation !== undefined) {
    expectation = weeklyPrefA.additionalPrefs.expectation;
  }
  // simWeight: 0~1 同频倾向, diffWeight: 0~1 互补倾向
  const simWeight = expectation / 100;
  const diffWeight = 1 - simWeight;

  // === 1. 大五人格 15 层面余弦相似度（最高 +20） ===
  const FACET_LIST = [
    'N_Anxiety', 'N_Vulnerability', 'N_Impulsiveness',
    'E_Gregariousness', 'E_Assertiveness', 'E_Warmth',
    'O_Ideas', 'O_Actions', 'O_Aesthetics',
    'A_Trust', 'A_Altruism', 'A_Compliance',
    'C_Order', 'C_Achievement', 'C_SelfDiscipline'
  ];
  function getDefaultFacets() {
    var def = {};
    FACET_LIST.forEach(function (f) { def[f] = 0.5; });
    return def;
  }
  const bfA = (userA.quantitativeScores?.bigFiveFacets) || getDefaultFacets();
  const bfB = (userB.quantitativeScores?.bigFiveFacets) || getDefaultFacets();
  let dot = 0, magA = 0, magB = 0;
  FACET_LIST.forEach(function (k) {
    var va = bfA[k] !== undefined ? bfA[k] : 0.5;
    var vb = bfB[k] !== undefined ? bfB[k] : 0.5;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  const cosSim = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  score += cosSim * 20 * simWeight + (1 - cosSim) * 10 * diffWeight;

  // === 2. 标签交集 / 差异（最高 +20） ===
  const tagsA = new Set((userA.displayTags || []).map(t => t.key));
  const tagsB = new Set((userB.displayTags || []).map(t => t.key));
  const shared = Array.from(tagsA).filter(t => tagsB.has(t));
  var diffCount = 0;
  tagsA.forEach(function (t) { if (!tagsB.has(t)) diffCount++; });
  tagsB.forEach(function (t) { if (!tagsA.has(t)) diffCount++; });
  score += shared.length * 4 * simWeight;
  score += diffCount * 1.5 * diffWeight;

  // === 3. 子类别重叠 / 差异（最高 +9） ===
  if (weeklyPrefA && weeklyPrefB && weeklyPrefA.subCategories && weeklyPrefB.subCategories) {
    var sharedSubs = 0;
    var diffSubs = 0;
    Object.keys(weeklyPrefA.subCategories).forEach(function (vibeKey) {
      var subsA = weeklyPrefA.subCategories[vibeKey] || [];
      var subsB = weeklyPrefB.subCategories[vibeKey] || [];
      subsA.forEach(function (sa) {
        if (subsB.some(function (sb) { return sb.value === sa.value; })) {
          sharedSubs++;
        } else {
          diffSubs++;
        }
      });
    });
    score += Math.min(sharedSubs * 3, 9) * simWeight;
    score += Math.min(diffSubs * 1.5, 5) * diffWeight;
  }

  // === 4. 频率偏好匹配（最高 +4） ===
  if (weeklyPrefA && weeklyPrefB && weeklyPrefA.additionalPrefs && weeklyPrefB.additionalPrefs) {
    var freqA = weeklyPrefA.additionalPrefs.frequency;
    var freqB = weeklyPrefB.additionalPrefs.frequency;
    if (freqA && freqB) {
      if (freqA === freqB) {
        score += 4;
      } else if (
        (freqA === 'daily' && freqB === 'weekly2-3') ||
        (freqA === 'weekly2-3' && freqB === 'daily') ||
        (freqA === 'weekly1' && freqB === 'casual') ||
        (freqA === 'casual' && freqB === 'weekly1')
      ) {
        score += 2;
      }
    }
  }

  // === 5. 作息匹配（最高 +3） ===
  if (userA.schedule && userB.schedule && userA.schedule === userB.schedule) {
    score += 3;
  }

  // === 6. 年级邻近加分（最高 +5） ===
  var gradeA = userA.grade || 0;
  var gradeB = userB.grade || 0;
  var gradeDiff = Math.abs(gradeA - gradeB);
  if (gradeDiff === 0) score += 5;
  else if (gradeDiff === 1) score += 3;
  else if (gradeDiff === 2) score += 1;

  // === 7. 同学院加分（最高 +2） ===
  if (userA.college && userB.college && userA.college === userB.college) {
    score += 2;
  }

  return Math.min(100, Math.round(score));
}

function getHighlightTags(userA, userB) {
  const tagsA = userA.displayTags || [];
  const tagsB = userB.displayTags || [];
  const bKeys = new Set(tagsB.map(t => t.key));
  return tagsA.filter(t => bKeys.has(t.key));
}

function getSharedTagsText(highlightTags) {
  return highlightTags.map(t => t.label).join('、') || '基础匹配';
}

function checkBidirectionalMatch(actionA, actionB) {
  if (!actionA || !actionB) return false;
  if (actionA === 'PASS' || actionB === 'PASS') return false;
  return true;
}

module.exports = {
  hardFilter,
  calculateSoftScore,
  getHighlightTags,
  checkBidirectionalMatch
};