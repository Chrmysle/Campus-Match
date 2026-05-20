// cloudfunctions/getUserProfile/index.js
// 获取用户最新数据（供个人主页刷新 aiSummary 等字段）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId } = event;

  if (!userId) {
    return { success: false, error: '缺少 userId' };
  }

  try {
    const { data } = await db.collection('users')
      .doc(userId)
      .field({
        aiSummary: true,
        bigFive: true,
        quantitativeScores: true,
        name: true,
        avatar: true,
        contact: true,
        grade: true,
        college: true,
        weeklyMatchStatus: true,
        weeklyMatchWeekLabel: true
      })
      .get();

    if (!data) {
      return { success: false, error: '用户不存在' };
    }

    return {
      success: true,
      data: {
        aiSummary: data.aiSummary || '',
        bigFive: data.bigFive || data.quantitativeScores?.bigFive || null,
        bigFiveFacets: data.quantitativeScores?.bigFiveFacets || null,
        name: data.name || '',
        avatar: data.avatar || '',
        contact: data.contact || '',
        grade: data.grade || 0,
        college: data.college || '',
        weeklyMatchStatus: data.weeklyMatchStatus || '',
        weeklyMatchWeekLabel: data.weeklyMatchWeekLabel || ''
      }
    };
  } catch (err) {
    console.error('[getUserProfile] error:', err);
    return { success: false, error: err.message };
  }
};