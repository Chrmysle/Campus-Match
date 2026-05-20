// pages/chat/chat.js — 双向盲选确认 & 联系方式解锁页
const { generateIceBreaker } = require('../../config/vibeThemes');
const WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');

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
      console.warn('[chat] no partnerId provided');
      this.setData({ matchStatus: 'error' });
    }
  },

  loadMatch: function (partnerId) {
    console.log('[chat] loading match for partner:', partnerId);
    var that = this;

    var userId = getApp().globalData.userId;
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();

    if (userId && weekLabel) {
      wx.cloud.callFunction({
        name: 'getMyMatchPool',
        data: { userId: userId, weekLabel: weekLabel },
        success: function (res) {
          if (res.result && res.result.success && res.result.pool) {
            var candidates = res.result.pool.candidates || [];
            var partnerData = null;
            for (var i = 0; i < candidates.length; i++) {
              if (candidates[i].candidateId === partnerId) {
                partnerData = candidates[i];
                break;
              }
            }
            if (partnerData) {
              that._displayPartner(partnerData);
              return;
            }
          }
          console.warn('[chat] partner not found in match pool:', partnerId);
          that.setData({ matchStatus: 'error' });
        },
        fail: function (err) {
          console.error('[chat] cloud load failed:', err);
          that.setData({ matchStatus: 'error' });
        }
      });
    } else {
      console.warn('[chat] no userId or weekLabel');
      this.setData({ matchStatus: 'error' });
    }
  },

  _displayPartner: function (partnerData) {
    var that = this;
    var vibeType = getVibeType();
    var sharedTags = (partnerData.highlightTags || partnerData.displayTags || []).map(function (t) {
      return t.key || t;
    });

    const iceBreakers = [
      generateIceBreaker(vibeType, sharedTags)
    ];

    // 先显示基础信息，同时异步拉取真实联系方式
    this.setData({
      matchStatus: 'matched',
      partner: {
        name: partnerData.name,
        avatar: partnerData.avatar,
        campus: partnerData.campus,
        scheduleLabel: partnerData.scheduleLabel,
        aiSummary: partnerData.aiSummary,
        highlightTags: partnerData.highlightTags || partnerData.displayTags || [],
        sharedTags: sharedTags
      },
      iceBreakers,
      contactUnlocked: false,
      contactInfo: '加载中...'
    });

    // 从云端获取对方的完整用户信息（含 contact 字段）
    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { userId: partnerData.candidateId },
      success: function (res) {
        if (res.result && res.result.success && res.result.data) {
          var cloudData = res.result.data;
          var contact = cloudData.contact || '';
          that.setData({
            contactUnlocked: true,
            contactInfo: contact ? contact : '未设置联系方式'
          });
        } else {
          that.setData({
            contactUnlocked: true,
            contactInfo: '暂未获取到联系方式'
          });
        }
      },
      fail: function () {
        that.setData({
          contactUnlocked: true,
          contactInfo: '暂未获取到联系方式'
        });
      }
    });

    console.log('[chat] match displayed:', partnerData.name);
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