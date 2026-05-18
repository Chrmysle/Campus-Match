// cloudfunctions/unlockContact/index.js
// 匹配成功后解密联系方式
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { userId, partnerId } = event;

  if (!userId || !partnerId) {
    return { success: false, error: '缺少必要参数' };
  }

  console.log('[unlockContact] 解锁联系方式:', userId, '<->', partnerId);

  try {
    // 验证关系状态
    const sorted = [userId, partnerId].sort();
    const { data: rels } = await db.collection('relationships')
      .where({ userA: sorted[0], userB: sorted[1], status: 'matched' }).get();

    if (rels.length === 0) {
      return { success: false, error: '未找到匹配关系或关系已断裂' };
    }

    // 读取对方联系方式（生产环境应在此解密）
    const { data: partner } = await db.collection('users').doc(partnerId).get();
    if (!partner || partner.length === 0) {
      return { success: false, error: '用户不存在' };
    }

    const contact = decryptContact(partner.encryptedContact);
    console.log('[unlockContact] 联系方式已解锁');

    return {
      success: true,
      contact: contact || '联系方式暂未设置',
      partnerName: partner.name || '校园搭子'
    };
  } catch (err) {
    console.error('[unlockContact] 错误:', err);
    return { success: false, error: err.message };
  }
};

// 解密联系方式（生产环境使用微信加密或 AES）
function decryptContact(encrypted) {
  if (!encrypted) return null;
  // 占位：生产环境应使用 crypto 模块解密
  return encrypted;
}