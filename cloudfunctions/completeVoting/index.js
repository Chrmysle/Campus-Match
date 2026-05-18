// cloudfunctions/completeVoting/index.js
// 用户完成本周所有投票后调用：标记 match_pool + users 状态
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, weekLabel } = event;

  if (!userId || !weekLabel) {
    return { success: false, error: '缺少参数' };
  }

  try {
    // 1. 更新 match_pool 的 completedSelection
    const { data: pools } = await db.collection('match_pool')
      .where({ userId, weekLabel })
      .limit(1)
      .get();

    if (pools.length > 0) {
      await db.collection('match_pool').doc(pools[0]._id).update({
        data: { completedSelection: true }
      });
    }

    // 2. 更新 users 的匹配状态
    await db.collection('users').doc(userId).update({
      data: {
        weeklyMatchStatus: 'completed',
        weeklyMatchWeekLabel: weekLabel
      }
    });

    console.log('[completeVoting] done:', userId, weekLabel);
    return { success: true };
  } catch (err) {
    console.error('[completeVoting] error:', err);
    return { success: false, error: err.message };
  }
};