// cloudfunctions/registerUser/index.js
// 注册用户：验证邮箱验证码 → 创建账号
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { email, code, password } = event;

  if (!email || !code || !password) {
    return { success: false, error: '缺少必要参数' };
  }
  if (password.length < 6) {
    return { success: false, error: '密码至少6位' };
  }

  try {
    // 1. 验证验证码
    const { data: codes } = await db.collection('verification_codes')
      .where({ email, used: false })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (codes.length === 0) {
      return { success: false, error: '请先获取验证码' };
    }

    const record = codes[0];
    if (record.code !== code) {
      return { success: false, error: '验证码错误' };
    }
    if (Date.now() > record.expiresAt) {
      return { success: false, error: '验证码已过期' };
    }

    // 标记验证码为已使用
    await db.collection('verification_codes').doc(record._id).update({
      data: { used: true }
    });

    // 2. 检查账号是否已存在
    const { data: existing } = await db.collection('users')
      .where({ email }).get();
    if (existing.length > 0) {
      return { success: false, error: '该邮箱已注册，请直接登录' };
    }

    // 3. 加密密码并创建用户
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    const userData = {
      email,
      passwordHash: hash,
      passwordSalt: salt,
      name: email.split('@')[0],
      avatar: '👤',
      isVerified: true,
      createdAt: db.serverDate(),
      userStatus: 'normal',
      campus: '',
      schedule: 'dayWalker',
      genderPreference: { type: 'any', targetGenders: [] }
    };

    const res = await db.collection('users').add({ data: userData });

    console.log('[registerUser] registered:', email, 'id:', res._id);

    return {
      success: true,
      user: {
        userId: res._id,
        email,
        name: userData.name,
        avatar: userData.avatar,
        isVerified: true
      }
    };
  } catch (err) {
    console.error('[registerUser] error:', err);
    return { success: false, error: err.message };
  }
};