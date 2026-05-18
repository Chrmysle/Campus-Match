// cloudfunctions/getMyMatchPool/index.js
// 获取当前用户的匹配池（候选人列表），用于主页卡片展示
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, weekLabel } = event;

  if (!userId || !weekLabel) {
    return { success: false, error: '缺少参数' };
  }

  try {
    const { data: pools } = await db.collection('match_pool')
      .where({ userId, weekLabel })
      .limit(1)
      .get();

    if (pools.length === 0) {
      return { success: true, pool: null, message: '暂无匹配池' };
    }

    const pool = pools[0];

    // 如果候选人信息不完整（只存了 candidateId），补全用户信息
    // 当前 engine 写入时已经包含了 name/avatar/campus 等快照字段，直接返回即可
    console.log('[getMyMatchPool] found pool for', userId, 'candidates:', pool.candidates.length);
    return { success: true, pool };
  } catch (err) {
    console.error('[getMyMatchPool] error:', err);
    return { success: false, error: err.message };
  }
};