// cloudfunctions/resolveReport/index.js
// 管理员核实投诉后触发：熔断 & 禁言惩罚
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { reportId, resolution } = event;

  if (!reportId) {
    return { success: false, error: '缺少 reportId' };
  }

  console.log('[resolveReport] 处理投诉:', reportId, 'resolution:', resolution);

  try {
    const { data: reports } = await db.collection('reports').doc(reportId).get();
    if (!reports || reports.length === 0) {
      return { success: false, error: '投诉记录不存在' };
    }

    const report = Array.isArray(reports) ? reports[0] : reports;
    const targetUserId = report.targetUser;

    if (resolution === 'resolved') {
      // 核实违规 → 熔断 + 禁言
      await db.collection('users').doc(targetUserId).update({
        data: {
          violationCount: db.command.inc(1),
          userStatus: 'banned',
          updatedAt: new Date()
        }
      });

      // 清除该用户所有 matched 关系
      await db.collection('relationships')
        .where({
          status: 'matched',
          _id: db.command.or([
            { userA: targetUserId },
            { userB: targetUserId }
          ])
        })
        .update({
          data: { status: 'severed', severedAt: new Date() }
        });

      // 从 match_pool 中移除
      await db.collection('match_pool')
        .where({ userId: targetUserId })
        .remove();

      console.log('[resolveReport] 用户已被封禁:', targetUserId);
    }

    // 更新投诉状态
    await db.collection('reports').doc(reportId).update({
      data: { status: resolution, resolvedAt: new Date() }
    });

    return { success: true, targetUserId, resolution };
  } catch (err) {
    console.error('[resolveReport] 错误:', err);
    return { success: false, error: err.message };
  }
};