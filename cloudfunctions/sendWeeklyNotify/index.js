// cloudfunctions/sendWeeklyNotify/index.js
// 周一面板放榜 → 向所有待放榜用户推送订阅消息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 从 config 读取模板ID（部署时替换为真实ID）
const TEMPLATE_ID = 'WX_TEMPLATE_ID_HERE';

exports.main = async (event, context) => {
  const { weekLabel } = event || {};
  console.log('[sendWeeklyNotify] 开始发送通知, weekLabel:', weekLabel);

  try {
    const { data: pools } = await db.collection('match_pool')
      .where({ revealed: false }).get();

    console.log('[sendWeeklyNotify] 待通知用户数:', pools.length);

    let sentCount = 0;
    let failCount = 0;

    for (const pool of pools) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: pool.userId,
          page: '/pages/index/index',
          data: {
            thing1: { value: '本周搭子已放榜' },
            thing2: { value: `${pool.candidates.length} 位候选人` },
            thing3: { value: '点击查看你的专属匹配' },
            date4: { value: new Date().toLocaleDateString('zh-CN') }
          },
          templateId: TEMPLATE_ID,
          miniprogramState: 'formal'
        });
        sentCount++;
      } catch (err) {
        failCount++;
        console.warn('[sendWeeklyNotify] 单条发送失败:', pool.userId, err.message);
        // 标记失败以便后台补发
        await db.collection('match_pool').doc(pool._id).update({
          data: { notifyFailed: true, notifyError: err.message }
        });
      }
    }

    // 将已通知的池标记为已放榜
    const poolIds = pools.map(p => p._id);
    if (poolIds.length > 0) {
      await db.collection('match_pool')
        .where({ _id: db.command.in(poolIds) })
        .update({ data: { revealed: true } });
    }

    console.log('[sendWeeklyNotify] 完成:', sentCount, '成功,', failCount, '失败');
    return { success: true, sentCount, failCount };
  } catch (err) {
    console.error('[sendWeeklyNotify] 错误:', err);
    return { success: false, error: err.message };
  }
};