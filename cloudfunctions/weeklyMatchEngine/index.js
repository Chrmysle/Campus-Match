// cloudfunctions/weeklyMatchEngine/index.js
// 每周一 21:00 Cron 触发：运行匹配算法，生成 match_pool
// 使用 weekly_preferences 的 vibeTypes 做硬过滤 + 子类别做加分
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 并发限制器：同时最多执行 concurrency 个异步任务
 */
function pMapLimit(tasks, concurrency) {
  var index = 0;
  var results = [];
  return new Promise(function (resolve, reject) {
    function next() {
      if (index >= tasks.length) {
        return resolve(results);
      }
      var i = index++;
      var task = tasks[i];
      Promise.resolve(typeof task === 'function' ? task() : task)
        .then(function (r) { results[i] = r; next(); })
        .catch(reject);
    }
    for (var j = 0; j < concurrency && j < tasks.length; j++) next();
  });
}

exports.main = async (event, context) => {
  const weekLabel = getWeekLabel();
  console.log('[weeklyMatchEngine] 开始本周匹配:', weekLabel);

  try {
    // 1. 并行读取所有数据（3 个读查询同时发出）
    console.log('[weeklyMatchEngine] 读取数据...');
    const [userRes, prefRes, oldPoolRes] = await Promise.all([
      db.collection('users').where({ userStatus: 'normal', isVerified: true }).get(),
      db.collection('weekly_preferences').where({ weekLabel: weekLabel }).get(),
      db.collection('match_pool').where({ weekLabel: _.neq(weekLabel) }).get()
    ]);

    const users = userRes.data;
    const weeklyPrefs = prefRes.data;
    const oldPools = oldPoolRes.data;

    // 构建 weeklyPrefsMap
    var weeklyPrefsMap = {};
    weeklyPrefs.forEach(function (wp) { weeklyPrefsMap[wp.userId] = wp; });
    console.log('[weeklyMatchEngine] 用户数:', users.length, '偏好数:', weeklyPrefs.length);

    // 2. 归档旧池（与后续计算并行进行，不阻塞）
    var archivePromise = (oldPools.length > 0)
      ? archiveOldPools(oldPools, weekLabel)
      : Promise.resolve();

    // 3. 预取交互数据（不依赖归档结果）
    const interactedIdsMap = await prefetchInteractions(users);

    // 4. 内存中生成所有用户的候选列表
    var poolEntries = [];
    users.forEach(function (user) {
      var candidates = generateCandidates(user, users, weeklyPrefsMap, interactedIdsMap);
      poolEntries.push({
        weekLabel: weekLabel,
        userId: user._id,
        candidates: candidates,
        revealed: false,
        createdAt: new Date()
      });
    });

    // 5. 批量写入 match_pool（带并发控制，避免千级用户打爆数据库）
    console.log('[weeklyMatchEngine] 批量写入候选池, 并发数:', poolEntries.length);
    var addTasks = [];
    poolEntries.forEach(function (entry) {
      if (entry.candidates.length > 0) {
        addTasks.push(function () {
          return db.collection('match_pool').add({ data: entry });
        });
      }
    });
    // 并发 20 条写入（可根据 DB 规格调整）
    var writeResults = await pMapLimit(addTasks, 20);
    var writeOk = writeResults.filter(function (r) { return r && r._id; }).length;
    console.log('[weeklyMatchEngine] 候选池写入完成:', writeOk, '/', addTasks.length);

    // 批量更新用户状态（单条 _.in 查询即可）
    var userIds = users.map(function (u) { return u._id; });
    await db.collection('users').where({ _id: _.in(userIds) }).update({
      data: {
        weeklyMatchStatus: 'completed',
        weeklyMatchWeekLabel: weekLabel
      }
    });

    // 等待归档完成（大概率已经完成了）
    await archivePromise;

    var totalCandidates = poolEntries.reduce(function (sum, e) { return sum + e.candidates.length; }, 0);
    console.log('[weeklyMatchEngine] 完成，候选总数:', totalCandidates);

    // 6. 通知（fire-and-forget，不阻塞返回）
    cloud.callFunction({ name: 'sendWeeklyNotify', data: { weekLabel } }).catch(function () {});

    return { success: true, weekLabel, usersMatched: users.length, totalCandidates };
  } catch (err) {
    console.error('[weeklyMatchEngine] 错误:', err);
    return { success: false, error: err.message };
  }
};

/**
 * 一次性预取所有用户的交互数据（match_actions + relationships + blacklists）
 * 返回 Map: userId → Set(interactedUserId)
 */
async function prefetchInteractions(users) {
  var map = {};
  var userIds = users.map(function (u) { return u._id; });

  // 初始化所有用户的空 Set
  userIds.forEach(function (id) { map[id] = new Set(); });

  // 批量查 match_actions（发起方在 user 集合中的）
  const { data: actions } = await db.collection('match_actions')
    .where({ fromUser: _.in(userIds) })
    .get();
  actions.forEach(function (a) {
    if (map[a.fromUser]) map[a.fromUser].add(a.toUser);
  });

  // 批量查 relationships
  const { data: relationships } = await db.collection('relationships')
    .where(_.or([{ userA: _.in(userIds) }, { userB: _.in(userIds) }]))
    .get();
  relationships.forEach(function (r) {
    if (map[r.userA]) map[r.userA].add(r.userB);
    if (map[r.userB]) map[r.userB].add(r.userA);
  });

  // 批量查 blacklists
  const { data: blacklists } = await db.collection('blacklists')
    .where(_.or([{ blocker: _.in(userIds) }, { blocked: _.in(userIds) }]))
    .get();
  blacklists.forEach(function (b) {
    if (map[b.blocker]) map[b.blocker].add(b.blocked);
    if (map[b.blocked]) map[b.blocked].add(b.blocker);
  });

  return map;
}

/**
 * 硬过滤：校区 + 作息 + 性别偏好 + 搭子类型（使用 weeklyPref vibeTypes）
 */
function hardFilter(user, candidate, userWeeklyPref, candidateWeeklyPref) {
  if (user._id === candidate._id) return false;
  if (user.campus !== candidate.campus) return false;
  // 作息不再作为硬过滤条件，改为软加分（见 calculateScore）

  // 从本周偏好中读取 vibeTypes 数组，回退到用户的 targetVibe
  var vibeTypes = null;
  if (userWeeklyPref && userWeeklyPref.vibeTypes && userWeeklyPref.vibeTypes.length > 0) {
    vibeTypes = userWeeklyPref.vibeTypes.map(function (v) { return v.value; });
  } else {
    vibeTypes = [user.targetVibe || 'study'];
  }

  // 候选人的 targetVibe 必须在用户选择的 vibeTypes 中
  var candidateVibe = candidate.targetVibe;
  // 如果候选人没有 targetVibe，尝试从他的每周偏好中取第一个
  if (!candidateVibe && candidateWeeklyPref && candidateWeeklyPref.vibeTypes && candidateWeeklyPref.vibeTypes.length > 0) {
    candidateVibe = candidateWeeklyPref.vibeTypes[0].value;
  }
  if (!candidateVibe) candidateVibe = 'study'; // 最终兜底

  if (!vibeTypes.includes(candidateVibe)) return false;

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
 * 受 expectation（互补/同频）和 frequency 偏好影响
 * 权重经过校准，使分数自然分布在 40-100 之间
 */
function computePersonalitySim(userA, userB) {
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
  const bfA = (userA.quantitativeScores && userA.quantitativeScores.bigFiveFacets) || getDefaultFacets();
  const bfB = (userB.quantitativeScores && userB.quantitativeScores.bigFiveFacets) || getDefaultFacets();
  let dot = 0, magA = 0, magB = 0;
  FACET_LIST.forEach(function (k) {
    var va = bfA[k] !== undefined ? bfA[k] : 0.5;
    var vb = bfB[k] !== undefined ? bfB[k] : 0.5;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

function calculateScore(userA, userB, prefA, prefB) {
  let score = 40; // 基础分

  // === 读取用户 A 的期待偏好 ===
  var expectation = 50;
  if (prefA && prefA.additionalPrefs && prefA.additionalPrefs.expectation !== undefined) {
    expectation = prefA.additionalPrefs.expectation;
  }
  // simWeight: 0~1, 越高越偏好同频；diffWeight: 0~1, 越高越偏好互补
  const simWeight = expectation / 100;
  const diffWeight = 1 - simWeight;

  // === 1. 大五人格 15 层面余弦相似度（最高 +20） ===
  const cosSim = computePersonalitySim(userA, userB);
  // 同频：人格越像分越高；互补：人格越不像分越高
  score += cosSim * 20 * simWeight + (1 - cosSim) * 10 * diffWeight;

  // === 2. 标签交集 / 差异（最高 +20） ===
  const tagsA = new Set((userA.displayTags || []).map(function (t) { return t.key; }));
  const tagsB = new Set((userB.displayTags || []).map(function (t) { return t.key; }));
  const shared = [];
  tagsA.forEach(function (t) { if (tagsB.has(t)) shared.push(t); });
  var diffCount = 0;
  tagsA.forEach(function (t) { if (!tagsB.has(t)) diffCount++; });
  tagsB.forEach(function (t) { if (!tagsA.has(t)) diffCount++; });

  score += shared.length * 4 * simWeight;
  score += diffCount * 1.5 * diffWeight;

  // === 3. 子类别重叠 / 差异（最高 +9） ===
  if (prefA && prefB && prefA.subCategories && prefB.subCategories) {
    var sharedSubs = 0;
    var diffSubs = 0;
    Object.keys(prefA.subCategories).forEach(function (vibeKey) {
      var subsA = prefA.subCategories[vibeKey] || [];
      var subsB = prefB.subCategories[vibeKey] || [];
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
  if (prefA && prefB && prefA.additionalPrefs && prefB.additionalPrefs) {
    var freqA = prefA.additionalPrefs.frequency;
    var freqB = prefB.additionalPrefs.frequency;
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

function generateCandidates(user, allUsers, weeklyPrefsMap, interactedIdsMap) {
  // 从预取数据中拿到已交互用户列表
  const interactedIds = interactedIdsMap[user._id] || new Set();

  // 用户自己的本周偏好
  var userPref = weeklyPrefsMap[user._id] || null;

  const filtered = allUsers.filter(function (c) {
    var cP = weeklyPrefsMap[c._id] || null;
    return hardFilter(user, c, userPref, cP) && !interactedIds.has(c._id);
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
      personalitySim: computePersonalitySim(user, c),
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

async function archiveOldPools(oldPools, currentWeekLabel) {
  if (oldPools.length === 0) return;
  console.log('[weeklyMatchEngine] 归档旧池数:', oldPools.length);
  // 用 Promise.all 并行复制所有旧记录到 history
  var copyTasks = oldPools.map(function (pool) {
    return db.collection('match_pool_history').add({ data: pool });
  });
  await Promise.all(copyTasks);
  // 删除旧的 pool 记录
  await db.collection('match_pool').where({ weekLabel: _.neq(currentWeekLabel) }).remove();
}

function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return year + 'W' + String(weekNum).padStart(2, '0');
}