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
    // 读取现有用户数据，保留 grade 和 college
    const { data: existing } = await db.collection('users').doc(userId).get();
    const grade = (existing && existing.grade) || 0;
    const college = (existing && existing.college) || '';

    await db.collection('users').doc(userId).update({
      data: {
        quizResults,
        quizDone: true,
        bigFive: quizResults.bigFive,
        quantitativeScores: { bigFive: quizResults.bigFive, bigFiveFacets: quizResults.bigFiveFacets },
        displayTags: quizResults.tags,
        schedule: quizResults.schedule,
        campus: quizResults.campus,
        contact: quizResults.contact || '',
        grade: grade,
        college: college
      }
    });

    console.log('[saveQuizResults] saved for user:', userId);
    return { success: true };
  } catch (err) {
    console.error('[saveQuizResults] error:', err);
    return { success: false, error: err.message };
  }
};