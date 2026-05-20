// cloudfunctions/updateUser/index.js
// 更新用户资料字段（昵称、头像等）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, fields } = event;

  if (!userId || !fields) {
    return { success: false, error: '缺少参数' };
  }

  try {
    const updateData = {};
    const allowedFields = ['name', 'avatar', 'genderPreference', 'grade', 'college', 'contact'];
    allowedFields.forEach(function (f) {
      if (fields[f] !== undefined) updateData[f] = fields[f];
    });

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: '没有可更新的字段' };
    }

    await db.collection('users').doc(userId).update({
      data: updateData
    });

    console.log('[updateUser] updated', Object.keys(updateData), 'for user:', userId);
    return { success: true, updated: Object.keys(updateData) };
  } catch (err) {
    console.error('[updateUser] error:', err);
    return { success: false, error: err.message };
  }
};