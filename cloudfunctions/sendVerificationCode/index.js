// cloudfunctions/sendVerificationCode/index.js
// 发送邮箱验证码（QQ 邮箱 SMTP）
const cloud = require('wx-server-sdk');
const nodemailer = require('nodemailer');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { email } = event;

  if (!email || !email.includes('@')) {
    return { success: false, error: '无效的邮箱地址' };
  }

  console.log('[sendVerificationCode] 发送验证码至:', email);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    await db.collection('verification_codes').add({
      data: { email, code, expiresAt, used: false, createdAt: db.serverDate() }
    });

    // QQ 邮箱 SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: 'campus_link@qq.com',
        pass: 'ukqoabvbqsixdjdd'
      }
    });

    // 发送邮件（await 已加）
    await transporter.sendMail({
      from: '"CampusLink" <campus_link@qq.com>',
      to: email,
      subject: 'CampusLink 邮箱验证码',
      text: '您的验证码是：' + code + '，请在10分钟内输入。'
    });

    console.log('[sendVerificationCode] 邮件已发送, 验证码:', code);
    return { success: true, message: '验证码已发送' };
  } catch (err) {
    console.error('[sendVerificationCode] 错误:', err);
    return { success: false, error: err.message };
  }
};