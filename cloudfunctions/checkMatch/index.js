// cloudfunctions/checkMatch/index.js
// 实时双向匹配判定 — 每次用户投票后调用
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { fromUser, toUser, actionType, weekLabel } = event;

  if (!fromUser || !toUser || !actionType) {
    return { success: false, error: '缺少必要参数' };
  }

  console.log('[checkMatch]', fromUser, '→', toUser, ':', actionType);

  try {
    // 1. 写入/更新投票记录（幂等覆盖）
    const { data: existing } = await db.collection('match_actions')
      .where({ fromUser, toUser, weekLabel }).get();

    if (existing.length > 0) {
      await db.collection('match_actions').doc(existing[0]._id).update({
        data: { actionType, timestamp: new Date() }
      });
    } else {
      await db.collection('match_actions').add({
        data: { fromUser, toUser, actionType, weekLabel, timestamp: new Date() }
      });
    }

    // 2. 如果 PASS，不检查反向
    if (actionType === 'PASS') {
      return { success: true, matched: false, actionType };
    }

    // 3. 检查对方是否也投了肯定票
    const { data: reverse } = await db.collection('match_actions')
      .where({ fromUser: toUser, toUser: fromUser, weekLabel }).get();

    if (reverse.length > 0 && reverse[0].actionType !== 'PASS') {
      // 双向盲选成功
      const sorted = [fromUser, toUser].sort();
      await db.collection('relationships').add({
        data: {
          userA: sorted[0],
          userB: sorted[1],
          status: 'matched',
          matchedAt: new Date()
        }
      });

      console.log('[checkMatch] 匹配成功!', sorted[0], '<->', sorted[1]);
      return { success: true, matched: true, actionType };
    }

    return { success: true, matched: false, actionType };
  } catch (err) {
    console.error('[checkMatch] 错误:', err);
    return { success: false, error: err.message };
  }
};