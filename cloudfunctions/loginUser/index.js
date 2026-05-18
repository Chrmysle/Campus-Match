// cloudfunctions/loginUser/index.js
// 用户登录：邮箱 + 密码验证
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { email, password } = event;

  if (!email || !password) {
    return { success: false, error: '请输入邮箱和密码' };
  }

  try {
    // 查找用户
    const { data: users } = await db.collection('users')
      .where({ email })
      .limit(1)
      .get();

    if (users.length === 0) {
      return { success: false, error: '账号不存在，请先注册' };
    }

    const user = users[0];

    // 验证密码
    const hash = crypto.pbkdf2Sync(password, user.passwordSalt, 1000, 64, 'sha512').toString('hex');
    if (hash !== user.passwordHash) {
      return { success: false, error: '密码错误' };
    }

    console.log('[loginUser] login success:', email);

    return {
      success: true,
      user: {
        userId: user._id,
        email: user.email,
        name: user.name || email.split('@')[0],
        avatar: user.avatar || '👤',
        isVerified: true,
        quizResults: user.quizResults || null,
        quizDone: user.quizDone || false,
        vibeTypes: user.vibeTypes || null,
        genderPreference: user.genderPreference || null,
        weeklyMatchStatus: user.weeklyMatchStatus || null,
        weeklyMatchWeekLabel: user.weeklyMatchWeekLabel || null
      }
    };
  } catch (err) {
    console.error('[loginUser] error:', err);
    return { success: false, error: err.message };
  }
};