// pages/profile/profile.js — 个人中心
const QUIZ_CONFIG = require('../../config/quizConfig');
const { VIBE_THEMES } = require('../../config/vibeThemes');

Page({
  data: {
    isVerified: false,
    userInfo: null,
    bigFiveList: [],
    displayTags: [],
    vibeType: '',
    vibeLabel: '',
    genderPreference: { type: 'any', targetGenders: [] },
    editMode: false,
    editableTags: [],
    showPrefModal: false,
    editingName: false,
    nameInput: ''
  },

  onLoad: function () {
    const app = getApp();
    if (!app.checkVerification()) return;
    this.setData({ isVerified: true });
    this.loadProfile();
  },

  onShow: function () {
    const app = getApp();
    if (!app.globalData.isVerified) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (!this.data.editMode) {
      this.loadProfile();
    }
  },

  loadProfile: function () {
    const quizResults = wx.getStorageSync('campusLink_quizResults') || {};
    const userInfo = wx.getStorageSync('campusLink_user') || {};
    const weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};

    const vibeTypes = quizResults.vibeTypes || (quizResults.vibeType ? [quizResults.vibeType] : ['study']);
    const vibeLabels = vibeTypes.map(function (vt) {
      return (VIBE_THEMES[vt] && VIBE_THEMES[vt].name) || vt;
    });
    const vibeType = vibeTypes[0];
    const vibeLabel = vibeLabels.join('、');

    // 读取本周偏好
    var weeklyVibeTypes = [];
    var hasWeeklyPref = false;
    var WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');
    if (weeklyPref && weeklyPref.weekLabel === WEEKLY_CONFIG.getWeekLabel()) {
      hasWeeklyPref = true;
      weeklyVibeTypes = weeklyPref.vibeTypes || [];
    }

    const tags = quizResults.tags || [];
    const bigFive = quizResults.bigFive || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };

    const bigFiveLabels = { N: '情绪稳定性', E: '外向性', O: '开放性', A: '宜人性', C: '尽责性' };
    const bigFiveList = Object.keys(bigFive).map(function (k) {
      var v = bigFive[k];
      return {
        key: k,
        label: bigFiveLabels[k] || k,
        value: v,
        percent: (v * 100).toFixed(1),
        width: (v * 100)
      };
    });

    this.setData({
      userInfo: {
        name: userInfo.name || '校园搭子',
        userId: userInfo.userId || userInfo.userid || '',
        email: userInfo.email || '***@buaa.edu.cn',
        campus: quizResults.campus || '学院路校区',
        schedule: quizResults.schedule || 'dayWalker',
        avatar: userInfo.avatar || '👤'
      },
      bigFiveList: bigFiveList,
      displayTags: tags,
      vibeType,
      vibeLabel,
      genderPreference: userInfo.genderPreference || { type: 'any', targetGenders: [] },
      nameInput: userInfo.name || '校园搭子',
      // 本周偏好
      hasWeeklyPref: hasWeeklyPref,
      weeklyVibeTypes: weeklyVibeTypes,
      weeklyPref: weeklyPref
    });
  },

  // ===== 本周偏好 =====

  onJoinWeeklyMatch: function () {
    wx.navigateTo({ url: '/pages/weekly-pref/weekly-pref' });
  },

  onClearWeeklyPref: function () {
    var that = this;
    wx.showModal({
      title: '清除本周偏好',
      content: '确定要清除本周匹配偏好吗？',
      success: function (res) {
        if (res.confirm) {
          wx.removeStorageSync('campusLink_weeklyPref');
          that.setData({
            hasWeeklyPref: false,
            weeklyVibeTypes: [],
            weeklyPref: null
          });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  // ===== 昵称编辑 =====

  onStartEditName: function () {
    this.setData({
      editingName: true,
      nameInput: this.data.userInfo.name
    });
  },

  onCancelEditName: function () {
    this.setData({ editingName: false });
  },

  onNameInput: function (e) {
    this.setData({ nameInput: e.detail.value });
  },

  onSaveName: function () {
    const name = (this.data.nameInput || '').trim();
    if (!name) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    const userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.name = name;
    wx.setStorageSync('campusLink_user', userInfo);

    this.setData({
      editingName: false,
      'userInfo.name': name
    });
    wx.showToast({ title: '昵称已更新', icon: 'success' });

    // 同步到云端
    const app = getApp();
    const userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'updateUser',
        data: { userId: userId, fields: { name: name } },
        fail: function (err) {
          console.error('[profile] cloud name sync failed:', err);
        }
      });
    }
  },

  // ===== 标签管理 =====

  onToggleEdit: function () {
    const next = !this.data.editMode;
    if (next) {
      const quizResults = wx.getStorageSync('campusLink_quizResults') || {};
      this.setData({
        editMode: true,
        editableTags: JSON.parse(JSON.stringify(quizResults.tags || []))
      });
    } else {
      this.setData({ editMode: false });
    }
  },

  onRemoveTag: function (e) {
    const idx = e.currentTarget.dataset.index;
    const editableTags = [...this.data.editableTags];
    editableTags.splice(idx, 1);
    this.setData({ editableTags });
  },

  onAddCustomTag: function () {
    const tags = [...this.data.editableTags];
    tags.push({
      type: 'custom',
      key: 'custom_' + Date.now(),
      emoji: '🏷️',
      label: '自定义标签'
    });
    this.setData({ editableTags: tags });
  },

  onSaveTags: function () {
    const quizResults = wx.getStorageSync('campusLink_quizResults') || {};
    quizResults.tags = JSON.parse(JSON.stringify(this.data.editableTags));
    wx.setStorageSync('campusLink_quizResults', quizResults);
    this.setData({
      displayTags: JSON.parse(JSON.stringify(this.data.editableTags)),
      editMode: false
    });
    wx.showToast({ title: '标签已更新', icon: 'success' });
  },

  // ===== 偏好设置 =====

  onTogglePrefModal: function () {
    this.setData({ showPrefModal: !this.data.showPrefModal });
  },

  onGenderPrefSelect: function (e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ genderPreference: { type, targetGenders: [] } });
  },

  onSavePrefs: function () {
    this.setData({ showPrefModal: false });
    const userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.genderPreference = this.data.genderPreference;
    wx.setStorageSync('campusLink_user', userInfo);
    wx.showToast({ title: '偏好已保存', icon: 'success' });

    // 同步到云端
    const app = getApp();
    const userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'updateUser',
        data: { userId: userId, fields: { genderPreference: this.data.genderPreference } },
        fail: function (err) {
          console.error('[profile] cloud genderPreference sync failed:', err);
        }
      });
    }
  },

  getBigFiveLabel: function (key) {
    const map = { N: '情绪稳定性', E: '外向性', O: '开放性', A: '宜人性', C: '尽责性' };
    return map[key] || key;
  },

  onRetakeQuiz: function () {
    wx.showModal({
      title: '重新测试',
      content: '重新完成问卷会覆盖当前的人格画像和标签，确定继续吗？',
      success: function (res) {
        if (res.confirm) {
          wx.reLaunch({ url: '/pages/quiz/quiz' });
        }
      }
    });
  }
});