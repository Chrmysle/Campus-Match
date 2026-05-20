// pages/weekly-pref/weekly-pref.js — 本周搭子偏好问卷
const { VIBE_THEMES } = require('../../config/vibeThemes');
const WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');

Page({
  data: {
    // 提交窗口检查
    submissionOpen: true,

    // 步骤控制
    currentStep: 1,
    totalSteps: 4,

    // 步骤 1: 搭子类型
    vibeTypeList: [],
    selectedVibeTypes: [],

    // 步骤 2: 子类别
    subCategoryTabs: [],
    activeSubTab: 0,
    selectedSubCategories: {},

    // 步骤 3: 额外偏好
    expectation: 50,
    frequency: 'weekly2-3',
    genderPreference: 'any',

    // 步骤 4: 确认
    canSubmit: false,
    submitting: false,

    // 标签提示
    vibeSummary: '',
    subCategorySummary: '',
    defaultColor: '#C4A484',
    defaultEmptyArray: [],

    // 暂停状态倒计时
    closedCountdownText: '',
    nextRevealTime: '',

    // 预计算的选中搭子类型对象（避免 WXML 中复杂表达式）
    selectedVibeTypeObjects: []
  },

  // 预计算选中搭子类型的 emoji/label/color
  _updateSelectedVibeTypeObjects: function () {
    var selected = this.data.selectedVibeTypes || [];
    var objs = selected.map(function (key) {
      var vt = WEEKLY_CONFIG.vibeTypes[key];
      return {
        value: key,
        emoji: (vt && vt.emoji) || '',
        label: (vt && vt.label) || key,
        color: (vt && vt.color) || this.data.defaultColor
      };
    }.bind(this));
    this.setData({ selectedVibeTypeObjects: objs });
  },

  onLoad: function () {
    // 检查提交窗口
    var open = WEEKLY_CONFIG.isSubmissionOpen();
    this.setData({
      submissionOpen: open,
      nextRevealTime: WEEKLY_CONFIG.getNextRevealTime().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    if (!open) {
      this._startClosedCountdown();
      return;
    }

    // 构造可选择的搭子类型列表
    const vibeTypeList = Object.keys(WEEKLY_CONFIG.vibeTypes).map(function (key) {
      var vt = WEEKLY_CONFIG.vibeTypes[key];
      var theme = VIBE_THEMES[key] || {};
      return {
        key: key,
        value: key,
        label: vt.label,
        emoji: vt.emoji,
        color: vt.color || theme.color || '#C4A484',
        selected: false
      };
    });
    var frequencyOptions = [];
    WEEKLY_CONFIG.additionalPrefs.forEach(function (p) {
      if (p.type === 'select' && p.options) frequencyOptions = p.options;
    });
    this.setData({
      vibeTypeList: vibeTypeList,
      module: WEEKLY_CONFIG,
      frequencyOptions: frequencyOptions
    });
    this._updateSelectedVibeTypeObjects();
    // 调试输入
    console.log('[weekly-pref] loaded', WEEKLY_CONFIG);
  },

  // ===== 步骤 1: 选择搭子类型 =====

  onToggleVibeType: function (e) {
    const key = e.currentTarget.dataset.key;
    var selected = this.data.selectedVibeTypes.slice();
    var idx = selected.indexOf(key);
    if (idx > -1) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= WEEKLY_CONFIG.maxVibeTypes) {
        wx.showToast({ title: '最多选' + WEEKLY_CONFIG.maxVibeTypes + '种', icon: 'none' });
        return;
      }
      selected.push(key);
    }
    // 更新选中状态
    var vibeTypeList = this.data.vibeTypeList.map(function (item) {
      item.selected = selected.indexOf(item.key) > -1;
      return item;
    });
    this.setData({ selectedVibeTypes: selected, vibeTypeList: vibeTypeList });
    this._updateSelectedVibeTypeObjects();
  },

  onNextStep1: function () {
    if (this.data.selectedVibeTypes.length === 0) {
      wx.showToast({ title: '请至少选择一种搭子类型', icon: 'none' });
      return;
    }
    // 为步骤 2 准备子类别标签页
    var subCategoryTabs = this.data.selectedVibeTypes.map(function (key) {
      var vt = WEEKLY_CONFIG.vibeTypes[key];
      return {
        key: key,
        label: vt.label,
        emoji: vt.emoji,
        subCategories: (vt.subCategories || []).map(function (sc) {
          return { ...sc, selected: false };
        })
      };
    });
    // 初始化选中状态
    var selectedSubCategories = {};
    this.data.selectedVibeTypes.forEach(function (key) {
      selectedSubCategories[key] = [];
    });
    this.setData({
      currentStep: 2,
      subCategoryTabs: subCategoryTabs,
      activeSubTab: 0,
      selectedSubCategories: selectedSubCategories
    });
  },

  // ===== 步骤 2: 子类别选择 =====

  onSwitchSubTab: function (e) {
    var index = parseInt(e.currentTarget.dataset.index);
    this.setData({ activeSubTab: index });
  },

  onToggleSubCategory: function (e) {
    var tabIndex = this.data.activeSubTab;
    var subKey = e.currentTarget.dataset.key;
    var tabs = this.data.subCategoryTabs.slice();
    var tab = tabs[tabIndex];
    if (!tab) return;
    var subs = tab.subCategories.map(function (s) {
      if (s.value === subKey) s.selected = !s.selected;
      return s;
    });
    tab.subCategories = subs;
    tabs[tabIndex] = tab;
    // 限制每人最多选 3 个
    var selectedCount = subs.filter(function (s) { return s.selected; }).length;
    if (selectedCount > WEEKLY_CONFIG.maxSubCategories) {
      subs = subs.map(function (s) {
        if (s.value === subKey) s.selected = false;
        return s;
      });
      tab.subCategories = subs;
      tabs[tabIndex] = tab;
      wx.showToast({ title: '最多选' + WEEKLY_CONFIG.maxSubCategories + '项', icon: 'none' });
      return;
    }
    // 更新 selectedSubCategories 字典
    var selectedSubCategories = { ...this.data.selectedSubCategories };
    selectedSubCategories[tab.key] = subs.filter(function (s) { return s.selected; }).map(function (s) { return { value: s.value, label: s.label, emoji: s.emoji }; });
    this.setData({ subCategoryTabs: tabs, selectedSubCategories: selectedSubCategories });
  },

  onPrevStep2: function () {
    this.setData({ currentStep: 1 });
  },

  onNextStep2: function () {
    // 至少需要一个子类别
    var hasAny = false;
    for (var key in this.data.selectedSubCategories) {
      if (this.data.selectedSubCategories[key].length > 0) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) {
      wx.showToast({ title: '请至少选择一个具体偏好', icon: 'none' });
      return;
    }
    this.setData({ currentStep: 3 });
  },

  // ===== 步骤 3: 额外偏好 =====

  onExpectationChange: function (e) {
    this.setData({ expectation: e.detail.value });
  },

  onFrequencySelect: function (e) {
    var value = e.currentTarget.dataset.value;
    var label = value;
    var opts = this.data.frequencyOptions;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === value) { label = opts[i].label; break; }
    }
    this.setData({ frequency: value, frequencyLabel: label });
  },

  onGenderPrefSelect: function (e) {
    var value = e.currentTarget.dataset.value;
    this.setData({ genderPreference: value });
  },

  onPrevStep3: function () {
    this.setData({ currentStep: 2 });
  },

  onNextStep3: function () {
    this.setData({ currentStep: 4 });
  },

  // ===== 步骤 4: 提交 =====

  onPrevStep4: function () {
    this.setData({ currentStep: 3 });
  },

  onSubmit: function () {
    var that = this;
    if (this.data.submitting) return;
    if (!WEEKLY_CONFIG.isSubmissionOpen()) {
      wx.showToast({ title: '提交已截止，请参与下周匹配', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });

    // 构造完整数据
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    var vibeTypes = this.data.selectedVibeTypes.map(function (key) {
      var vt = WEEKLY_CONFIG.vibeTypes[key];
      return { value: key, label: vt.label, emoji: vt.emoji };
    });
    var weeklyPrefData = {
      weekLabel: weekLabel,
      vibeTypes: vibeTypes,
      subCategories: this.data.selectedSubCategories,
      additionalPrefs: {
        expectation: this.data.expectation,
        frequency: this.data.frequency
      },
      genderPreference: this.data.genderPreference,
      submittedAt: new Date().toISOString()
    };

    // 本地存储
    wx.setStorageSync('campusLink_weeklyPref', weeklyPrefData);
    // 同时更新用户状态缓存，确保主页能读取到云端状态
    var userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.weeklyMatchStatus = 'submitted';
    userInfo.weeklyMatchWeekLabel = weekLabel;
    // 将性别偏好同步到用户记录（匹配引擎从此字段读取）
    userInfo.genderPreference = { type: that.data.genderPreference, targetGenders: [] };
    wx.setStorageSync('campusLink_user', userInfo);
    console.log('[weekly-pref] saved locally:', weeklyPrefData);

    // 云存储
    var app = getApp();
    var userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'saveWeeklyPreference',
        data: {
          userId: userId,
          weekLabel: weekLabel,
          vibeTypes: vibeTypes,
          subCategories: that.data.selectedSubCategories,
          additionalPrefs: {
            expectation: that.data.expectation,
            frequency: that.data.frequency
          },
          genderPreference: that.data.genderPreference
        },
        success: function (res) {
          console.log('[weekly-pref] cloud save result:', res);
        },
        fail: function (err) {
          console.error('[weekly-pref] cloud save failed:', err);
        },
        complete: function () {
          wx.showToast({ title: '偏好已提交！', icon: 'success' });
          setTimeout(function () {
            wx.navigateBack({ delta: 1 });
          }, 1000);
        }
      });
    } else {
      wx.showToast({ title: '偏好已提交！', icon: 'success' });
      setTimeout(function () {
        wx.navigateBack({ delta: 1 });
      }, 1000);
    }
  },

  // ===== 提交暂停状态 =====

  _startClosedCountdown: function () {
    var update = function () {
      var now = new Date();
      var target = WEEKLY_CONFIG.getNextRevealTime();
      var diff = target - now;
      if (diff <= 0) {
        this.setData({ closedCountdownText: '即将开启！' });
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var text = '';
      if (d > 0) text += d + '天 ';
      text += h + '小时 ' + m + '分钟';
      this.setData({ closedCountdownText: text });
      this._cdTimer = setTimeout(update.bind(this), 60000);
    }.bind(this);
    update();
  },

  onUnload: function () {
    if (this._cdTimer) clearTimeout(this._cdTimer);
  }
});