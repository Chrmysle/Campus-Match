// cloudfunctions/revealMatch/index.js
// 周一 21:00 触发：将本周 match_pool 全部设为 revealed，用户状态设为 completed
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const weekLabel = getWeekLabel();
  console.log('[revealMatch] 开始放榜:', weekLabel);

  try {
    // 1. 批量更新 match_pool：一条指令全部设为 revealed
    const poolResult = await db.collection('match_pool')
      .where({ weekLabel })
      .update({ data: { revealed: true } });
    console.log('[revealMatch] 池更新:', JSON.stringify(poolResult));

    // 2. 获取本周所有提交了偏好的用户
    const { data: prefs } = await db.collection('weekly_preferences')
      .where({ weekLabel })
      .get();

    if (prefs.length > 0) {
      // 提取所有 userId，一条批量更新全部设为 completed
      var targetIds = prefs.map(function (p) { return p.userId; });
      // 去重
      targetIds = targetIds.filter(function (id, i) { return targetIds.indexOf(id) === i; });

      var userResult = await db.collection('users')
        .where({ _id: _.in(targetIds), weeklyMatchStatus: _.neq('completed') })
        .update({ data: { weeklyMatchStatus: 'completed', weeklyMatchWeekLabel: weekLabel } });
      console.log('[revealMatch] 用户更新:', JSON.stringify(userResult));
    }

    // 3. 通知（fire-and-forget）
    cloud.callFunction({ name: 'sendWeeklyNotify', data: { weekLabel, action: 'reveal' } })
      .catch(function () {});

    return { success: true, weekLabel };
  } catch (err) {
    console.error('[revealMatch] 错误:', err);
    return { success: false, error: err.message };
  }
};

function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return year + 'W' + String(weekNum).padStart(2, '0');
}