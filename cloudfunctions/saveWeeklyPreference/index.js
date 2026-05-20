// cloudfunctions/saveWeeklyPreference/index.js
// 保存用户本周搭子偏好
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, weekLabel, vibeTypes, subCategories, additionalPrefs, genderPreference } = event;

  if (!userId || !weekLabel) {
    return { success: false, error: '缺少参数' };
  }

  try {
    // 查重：同一用户同一周只能有一条记录
    const { data: existing } = await db.collection('weekly_preferences')
      .where({ userId, weekLabel })
      .limit(1)
      .get();

    const data = {
      vibeTypes: vibeTypes || [],
      subCategories: subCategories || {},
      additionalPrefs: additionalPrefs || {},
      genderPreference: genderPreference || 'any',
      updatedAt: db.serverDate()
    };

    if (existing.length > 0) {
      await db.collection('weekly_preferences').doc(existing[0]._id).update({ data });
    } else {
      data.userId = userId;
      data.weekLabel = weekLabel;
      data.createdAt = db.serverDate();
      await db.collection('weekly_preferences').add({ data });
    }

    // 在 users 文档标记本周已提交 + 匹配状态 + 性别偏好 + targetVibe
    var firstVibe = (vibeTypes && vibeTypes.length > 0) ? vibeTypes[0].value : null;
    var updateData = {
      weeklyPrefSubmitted: true,
      weeklyPrefWeekLabel: weekLabel,
      weeklyMatchStatus: 'submitted',
      weeklyMatchWeekLabel: weekLabel,
      genderPreference: { type: genderPreference || 'any', targetGenders: [] }
    };
    if (firstVibe) {
      updateData.targetVibe = firstVibe;
    }

    await db.collection('users').doc(userId).update({ data: updateData });

    console.log('[saveWeeklyPreference] saved for user:', userId, 'week:', weekLabel);
    return { success: true };
  } catch (err) {
    console.error('[saveWeeklyPreference] error:', err);
    return { success: false, error: err.message };
  }
};