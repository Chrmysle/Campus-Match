// pages/chat/chat.js — 双向盲选确认 & 联系方式解锁页
const { generateIceBreaker } = require('../../config/vibeThemes');
const MOCK = require('../../mock/data');

// 从存储读取 vibeType（优先本周偏好，回退到问卷结果）
function getVibeType() {
  var weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};
  if (weeklyPref.vibeTypes && weeklyPref.vibeTypes.length > 0) {
    return weeklyPref.vibeTypes[0].value;
  }
  var quizResults = wx.getStorageSync('campusLink_quizResults') || {};
  return quizResults.vibeType || 'study';
}

Page({
  data: {
    isVerified: false,
    matchStatus: 'loading',
    partner: null,
    iceBreakers: [],
    contactUnlocked: false,
    contactInfo: '',
    defaultAvatar: '👤'
  },

  onLoad: function (options) {
    const app = getApp();
    if (!app.checkVerification()) return;
    this.setData({ isVerified: true });

    const partnerId = options.partnerId;
    if (partnerId) {
      this.loadMatch(partnerId);
    } else {
      this.loadMockMatch();
    }
  },

  loadMockMatch: function () {
    const match = MOCK.getMockMatch();

    const vibeType = getVibeType();
    const sharedTags = match.sharedTags || [];

    const iceBreakers = [
      generateIceBreaker(vibeType, sharedTags)
    ];

    this.setData({
      matchStatus: 'matched',
      partner: match,
      iceBreakers,
      contactUnlocked: true,
      contactInfo: match.contact || 'WeChat: campusync_' + match.name
    });

    console.log('[chat] match loaded:', match.name, 'iceBreakers:', iceBreakers.length);
  },

  loadMatch: function (partnerId) {
    console.log('[chat] loading match for partner:', partnerId);

    const user = MOCK.getUserById(partnerId);
    if (!user) {
      console.warn('[chat] partner not found:', partnerId);
      this.loadMockMatch();
      return;
    }

    const vibeType = getVibeType();
    const sharedTags = (user.displayTags || []).map(t => t.key);

    const iceBreakers = [
      generateIceBreaker(vibeType, sharedTags)
    ];

    this.setData({
      matchStatus: 'matched',
      partner: {
        name: user.name,
        avatar: user.avatar,
        campus: user.campus,
        scheduleLabel: user.scheduleLabel,
        aiSummary: user.aiSummary,
        highlightTags: user.displayTags || [],
        sharedTags: sharedTags
      },
      iceBreakers,
      contactUnlocked: true,
      contactInfo: 'WeChat: ' + user.userId + '_buaa'
    });
  },

  onCopyContact: function () {
    if (!this.data.contactInfo) return;
    wx.setClipboardData({
      data: this.data.contactInfo,
      success: () => {
        wx.showToast({ title: '已复制联系方式', icon: 'success' });
      }
    });
  },

  onBlock: function () {
    wx.showModal({
      title: '确认拉黑',
      content: '拉黑后双方将无法看到彼此的联系方式，且不可恢复。',
      confirmText: '确认拉黑',
      confirmColor: '#C04040',
      success: (res) => {
        if (res.confirm) {
          console.log('[chat] user blocked');
          this.setData({ matchStatus: 'severed', contactUnlocked: false, contactInfo: '' });
          wx.showToast({ title: '已解除匹配', icon: 'none' });
        }
      }
    });
  },

  onReport: function () {
    wx.showModal({
      title: '投诉用户',
      content: '如果对方有违规行为，投诉将由管理员核实处理。',
      confirmText: '提交投诉',
      confirmColor: '#C04040',
      success: (res) => {
        if (res.confirm) {
          console.log('[chat] user reported');
          wx.showToast({ title: '投诉已提交', icon: 'none' });
        }
      }
    });
  }
});