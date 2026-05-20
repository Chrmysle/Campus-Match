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

    // 读取对方联系方式
    const { data: partner } = await db.collection('users').doc(partnerId).get();
    if (!partner || !partner._id) {
      return { success: false, error: '用户不存在' };
    }

    var contact = partner.contact || (partner.quizResults && partner.quizResults.contact) || '';
    console.log('[unlockContact] 联系方式已解锁');

    return {
      success: true,
      contact: contact || '对方暂未设置联系方式',
      partnerName: partner.name || '校园搭子'
    };
  } catch (err) {
    console.error('[unlockContact] 错误:', err);
    return { success: false, error: err.message };
  }
};