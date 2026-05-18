// cloudfunctions/saveQuizResults/index.js
// 保存问卷结果到云数据库（在本地缓存之外持久化）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, quizResults } = event;

  if (!userId || !quizResults) {
    return { success: false, error: '缺少参数' };
  }

  try {
    await db.collection('users').doc(userId).update({
      data: {
        quizResults,
        quizDone: true,
        bigFive: quizResults.bigFive,
        displayTags: quizResults.tags,
        schedule: quizResults.schedule,
        campus: quizResults.campus
      }
    });

    console.log('[saveQuizResults] saved for user:', userId);
    return { success: true };
  } catch (err) {
    console.error('[saveQuizResults] error:', err);
    return { success: false, error: err.message };
  }
};