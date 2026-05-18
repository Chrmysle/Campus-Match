// pages/index/index.js — 匹配大厅（三态主页）
const MOCK = require('../../mock/data');
const { VIBE_THEMES } = require('../../config/vibeThemes');
const matchEngine = require('../../mock/matchEngine');
const WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');

function buildMockCurrentUser() {
  const quizResults = wx.getStorageSync('campusLink_quizResults') || {};
  const userInfo = wx.getStorageSync('campusLink_user') || {};
  const weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};
  const campusMap = { xueyuanlu: '学院路校区', shahe: '沙河校区', other: '其他校区' };

  // 从 weeklyPref 中读取 vibeTypes（新流程），回退到 quizResults
  var vibeTypes = [];
  if (weeklyPref.vibeTypes && weeklyPref.vibeTypes.length > 0) {
    vibeTypes = weeklyPref.vibeTypes.map(function (v) { return v.value; });
  } else {
    vibeTypes = quizResults.vibeTypes || (quizResults.vibeType ? [quizResults.vibeType] : ['study']);
  }

  return {
    _id: userInfo.userId || 'mock_current_user',
    campus: campusMap[quizResults.campus] || quizResults.campus || '学院路校区',
    schedule: quizResults.schedule || 'dayWalker',
    targetVibe: vibeTypes[0],
    vibeTypes: vibeTypes,
    gender: 1,
    genderPreference: userInfo.genderPreference || { type: 'any', targetGenders: [] },
    quantitativeScores: { bigFive: quizResults.bigFive || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 } },
    displayTags: quizResults.tags || []
  };
}

Page({
  data: {
    isVerified: false,

    // 三态主页
    homepageState: 'loading',
    weeklySubmitted: false,
    weeklyPref: null,
    weeklyVibeTypes: [],
    displayTags: [],
    userPersonality: null,
    userSchedule: '',
    userCampus: '',

    // 匹配时段
    inMatchWindow: false,
    countdownText: '',
    nextMatchTime: '',
    currentVibe: '',
    vibeTypes: [],
    vibeThemeList: [],
    vibeTheme: null,

    // 候选卡片
    candidates: [],
    currentIndex: 0,
    currentCard: null,
    remaining: 0,
    allVoted: false,

    // 滑动追踪
    touchStartX: 0,
    touchStartY: 0,
    swipeOffset: 0,
    swipeRotate: 0,
    swipeOpacity: 1,
    swipeTransition: false,

    // 模拟匹配测试
    mockTestActive: false,
    matchResults: [],
    showMockTest: false,

    // 默认回退值（避免 WXML 中字符串字面量）
    defaultEmoji: '🎯',
    defaultAvatar: '👤'
  },

  onLoad: function () {
    const app = getApp();
    if (!app.checkVerification()) return;
    this.setData({ isVerified: true });
    this.initHomepage();
  },

  onShow: function () {
    const app = getApp();
    if (!app.globalData.isVerified) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    // 每次显示时重新检查（从 weekly-pref 页返回时触发刷新）
    this.initHomepage();
  },

  // ===== 主页状态管理 =====

  initHomepage: function () {
    // 优先从云端状态判断，回退到本地缓存
    if (!this.checkCloudMatchStatus()) {
      this.checkWeeklyPrefStatus();
    }
    this.checkMatchWindow();
    this.loadPersonalityPreview();
  },

  checkWeeklyPrefStatus: function () {
    var weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || null;
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    var submitted = false;
    var vibeTypes = [];

    if (weeklyPref && weeklyPref.weekLabel === weekLabel) {
      submitted = true;
      vibeTypes = weeklyPref.vibeTypes || [];
    }

    this.setData({
      weeklySubmitted: submitted,
      weeklyPref: weeklyPref,
      weeklyVibeTypes: vibeTypes
    });
  },

  // 从云端登录信息读取匹配状态（跨设备/清除缓存后依然有效）
  checkCloudMatchStatus: function () {
    var userInfo = wx.getStorageSync('campusLink_user') || {};
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    var status = userInfo.weeklyMatchStatus;
    var statusWeek = userInfo.weeklyMatchWeekLabel;

    // 只有同一周的状态才有效
    if (status === 'completed' && statusWeek === weekLabel) {
      this.setData({
        weeklySubmitted: true,
        homepageState: 'completed'
      });
      return true;
    }

    if (status === 'voting' && statusWeek === weekLabel) {
      this.setData({ inMatchWindow: true });
      this.loadMatchPool();
      return true;
    }

    return false; // 回退到本地缓存判断
  },

  determineHomepageState: function () {
    // completed 由 checkCloudMatchStatus 设置，不覆盖
    if (this.data.homepageState === 'completed') return;
    if (this.data.inMatchWindow || this.data.mockTestActive) {
      this.setData({ homepageState: 'matching' });
    } else if (this.data.weeklySubmitted) {
      this.setData({ homepageState: 'waiting' });
    } else {
      this.setData({ homepageState: 'not_submitted' });
    }
  },

  loadPersonalityPreview: function () {
    var quizResults = wx.getStorageSync('campusLink_quizResults') || {};
    var tags = quizResults.tags || [];
    var bigFive = quizResults.bigFive || null;

    var userSchedule = 'dayWalker';
    if (quizResults.schedule === 'earlyBird') userSchedule = '早起鸟 🦅';
    else if (quizResults.schedule === 'nightOwl') userSchedule = '夜猫子 🦉';
    else if (quizResults.schedule === 'chaotic') userSchedule = '混乱中立 🌀';
    else userSchedule = '日行者 ☀️';

    var campusMap = { xueyuanlu: '学院路校区', shahe: '沙河校区', other: '其他校区' };
    var userCampus = campusMap[quizResults.campus] || quizResults.campus || '学院路校区';

    this.setData({
      displayTags: tags.slice(0, 4),
      userPersonality: bigFive,
      userSchedule: userSchedule,
      userCampus: userCampus
    });
  },

  onJoinWeeklyMatch: function () {
    // 检查是否已完成人格问卷
    var quizResults = wx.getStorageSync('campusLink_quizResults');
    if (!quizResults || !quizResults.bigFive) {
      wx.showModal({
        title: '提示',
        content: '请先完成人格问卷，生成你的性格画像',
        confirmText: '去答题',
        success: function (res) {
          if (res.confirm) wx.navigateTo({ url: '/pages/quiz/quiz' });
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/weekly-pref/weekly-pref' });
  },

  onTabMockTest: function () {
    this.setData({ showMockTest: !this.data.showMockTest });
  },

  // ===== 匹配窗口 =====

  checkMatchWindow: function () {
    var now = new Date();
    var day = now.getDay();
    var minutes = now.getHours() * 60 + now.getMinutes();
    // 周一 21:00 = day 1, minute 1260
    var inWindow = day === 1 && minutes >= 1260;

    if (inWindow) {
      if (!this.data.inMatchWindow) {
        this.setData({ inMatchWindow: true });
        this.loadMatchPool();
      }
    } else {
      this.setData({ inMatchWindow: false });
      this.updateCountdown();
    }
    this.determineHomepageState();
  },

  updateCountdown: function () {
    var now = new Date();
    var day = now.getDay();
    var target = new Date(now);
    if (day === 1 && now.getHours() < 21) {
      target.setHours(21, 0, 0, 0);
    } else {
      target.setDate(now.getDate() + ((8 - day) % 7 || 7));
      target.setHours(21, 0, 0, 0);
    }
    var diff = target - now;
    if (diff <= 0) {
      this.setData({ countdownText: '匹配已开始！' });
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var text = '';
    if (d > 0) text += d + '天 ';
    text += h + '小时 ' + m + '分钟';
    this.setData({ countdownText: text, nextMatchTime: target.toLocaleString('zh-CN') });
    if (this._countdownTimer) clearTimeout(this._countdownTimer);
    this._countdownTimer = setTimeout(this.updateCountdown.bind(this), 60000);
  },

  loadMatchPool: function () {
    var pool = MOCK.getCurrentUserMatchPool();
    var weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};
    var vibeTypes = [];
    if (weeklyPref.vibeTypes && weeklyPref.vibeTypes.length > 0) {
      vibeTypes = weeklyPref.vibeTypes.map(function (v) { return v.value; });
    } else {
      var quizResults = wx.getStorageSync('campusLink_quizResults') || {};
      vibeTypes = quizResults.vibeTypes || (quizResults.vibeType ? [quizResults.vibeType] : ['study']);
    }
    var vibeTheme = VIBE_THEMES[vibeTypes[0]] || null;
    var vibeThemeList = vibeTypes.map(function (vt) {
      var t = VIBE_THEMES[vt];
      return { key: vt, emoji: (t && t.emoji) || '🎯', name: (t && t.name) || vt, color: (t && t.color) || '#C4A484' };
    });
    this.setData({
      currentVibe: vibeTypes[0],
      vibeTypes: vibeTypes,
      vibeThemeList: vibeThemeList,
      vibeTheme: vibeTheme,
      candidates: pool.candidates || [],
      remaining: (pool.candidates || []).length,
      currentCard: (pool.candidates || [])[0] || null,
      currentIndex: 0,
      allVoted: false
    });
  },

  // ===== 触摸滑动 =====

  onTouchStart: function (e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY,
      swipeTransition: false
    });
  },

  onTouchMove: function (e) {
    var touchStartX = this.data.touchStartX;
    if (!touchStartX) return;
    var deltaX = e.touches[0].clientX - touchStartX;
    this.setData({
      swipeOffset: deltaX,
      swipeRotate: deltaX / 12,
      swipeOpacity: Math.max(0.4, 1 - Math.abs(deltaX) / 500)
    });
  },

  onTouchEnd: function (e) {
    var touchStartX = this.data.touchStartX;
    var touchStartY = this.data.touchStartY;
    var swipeOffset = this.data.swipeOffset;
    if (!touchStartX) return;

    var deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
    var absX = Math.abs(swipeOffset);

    if (deltaY > absX * 1.5 && absX < 50) {
      this.snapBack();
      return;
    }

    if (absX >= 120) {
      var action = swipeOffset < 0 ? 'PASS' : 'HEART';
      this.exitWithTransition(action, function () {
        this.processVote(action);
        this.resetCardState();
      }.bind(this));
    } else if (absX < 10) {
      this.exitWithTransition('MEET', function () {
        this.processVote('MEET');
        this.resetCardState();
      }.bind(this));
    } else {
      this.snapBack();
    }
  },

  exitWithTransition: function (actionType, callback) {
    var isPass = actionType === 'PASS';
    this.setData({
      swipeTransition: true,
      swipeOffset: isPass ? -500 : 500,
      swipeRotate: isPass ? -20 : 20,
      swipeOpacity: 0
    });
    setTimeout(callback, 300);
  },

  snapBack: function () {
    this.setData({
      swipeTransition: true,
      touchStartX: 0,
      touchStartY: 0,
      swipeOffset: 0,
      swipeRotate: 0,
      swipeOpacity: 1
    });
    setTimeout(function () { this.setData({ swipeTransition: false }); }.bind(this), 300);
  },

  resetCardState: function () {
    this.setData({
      touchStartX: 0,
      touchStartY: 0,
      swipeOffset: 0,
      swipeRotate: 0,
      swipeOpacity: 1,
      swipeTransition: false
    });
  },

  // ===== 投票逻辑 =====

  processVote: function (actionType) {
    var currentCard = this.data.currentCard;
    var currentIndex = this.data.currentIndex;
    var candidates = this.data.candidates;
    if (!currentCard) return;

    var updatedCandidates = candidates.slice();
    updatedCandidates[currentIndex] = Object.assign({}, currentCard, { voted: actionType });
    var remaining = updatedCandidates.filter(function (c) { return !c.voted; }).length;
    this.setData({ candidates: updatedCandidates, remaining: remaining });

    if (remaining === 0) {
      this.setData({ currentCard: null });
      if (this.data.mockTestActive) {
        this.checkMockResults();
      } else {
        this.setData({ allVoted: true });
      }
      return;
    }
    var nextIdx = -1;
    for (var i = 0; i < updatedCandidates.length; i++) {
      if (!updatedCandidates[i].voted) { nextIdx = i; break; }
    }
    this.setData({ currentIndex: nextIdx, currentCard: updatedCandidates[nextIdx] });
  },

  onVote: function (e) {
    var actionType = e.currentTarget.dataset.action;
    this.exitWithTransition(actionType, function () {
      this.processVote(actionType);
      this.resetCardState();
    }.bind(this));
  },

  // ===== 模拟匹配测试 =====

  onMockMatchTest: function () {
    var quizResults = wx.getStorageSync('campusLink_quizResults');
    var weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};
    if (!quizResults || !quizResults.bigFive) {
      wx.showModal({
        title: '提示',
        content: '请先完成人格问卷，才能进行匹配测试',
        confirmText: '去答题',
        success: function (res) {
          if (res.confirm) wx.navigateTo({ url: '/pages/quiz/quiz' });
        }
      });
      return;
    }

    var currentUser = buildMockCurrentUser();
    var candidates = matchEngine.runMatch(currentUser, matchEngine.MOCK_USERS, weeklyPref, MOCK.MOCK_WEEKLY_PREFS);

    if (!candidates || candidates.length === 0) {
      wx.showToast({ title: '未找到匹配的搭子', icon: 'none' });
      return;
    }

    var vibeTypes = currentUser.vibeTypes || ['study'];
    var vibeTheme = VIBE_THEMES[vibeTypes[0]] || null;
    var vibeThemeList = vibeTypes.map(function (vt) {
      var t = VIBE_THEMES[vt];
      return { key: vt, emoji: (t && t.emoji) || '🎯', name: (t && t.name) || vt, color: (t && t.color) || '#C4A484' };
    });

    this.setData({
      mockTestActive: true,
      homepageState: 'matching',
      candidates: candidates,
      vibeTypes: vibeTypes,
      vibeThemeList: vibeThemeList,
      vibeTheme: vibeTheme,
      currentCard: candidates[0],
      currentIndex: 0,
      remaining: candidates.length,
      allVoted: false,
      matchResults: [],
      showMockTest: false
    });
  },

  checkMockResults: function () {
    var candidates = this.data.candidates;
    var results = candidates.map(function (c) {
      var theirVote = MOCK.simulateOtherVote(c.score);
      var mutual = matchEngine.checkBidirectionalMatch(c.voted, theirVote);
      return {
        candidateId: c.candidateId,
        name: c.name,
        avatar: c.avatar,
        score: c.score,
        myVote: c.voted,
        theirVote: theirVote,
        mutual: mutual,
        status: mutual ? 'matched' : (c.voted === 'PASS' ? 'passed' : 'rejected')
      };
    });
    this.setData({ matchResults: results, allVoted: true });
    // 投票完成，持久化到云端
    this.completeWeeklyVoting();
  },

  // 保存"本周匹配已完成"状态到云端（跨设备同步）
  completeWeeklyVoting: function () {
    var app = getApp();
    var userId = app.globalData.userId;
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    if (!userId || !weekLabel) return;

    wx.cloud.callFunction({
      name: 'completeVoting',
      data: { userId: userId, weekLabel: weekLabel },
      success: function (res) {
        console.log('[index] completeVoting success:', res);
        // 更新本地用户信息，确保下次启动时读到 completed 状态
        var userInfo = wx.getStorageSync('campusLink_user') || {};
        userInfo.weeklyMatchStatus = 'completed';
        userInfo.weeklyMatchWeekLabel = weekLabel;
        wx.setStorageSync('campusLink_user', userInfo);
      },
      fail: function (err) {
        console.error('[index] completeVoting failed:', err);
        // 不阻塞用户体验，本地状态会在下次登录时从云端同步
      }
    });
  },

  resetMockTest: function () {
    this.setData({
      mockTestActive: false,
      matchResults: [],
      candidates: [],
      currentCard: null,
      currentIndex: 0,
      remaining: 0,
      allVoted: false,
      vibeTypes: [],
      vibeThemeList: [],
      vibeTheme: null,
      swipeOffset: 0,
      swipeRotate: 0,
      swipeOpacity: 1
    });
    this.initHomepage();
  },

  onNavigateToChat: function (e) {
    var partnerId = e.currentTarget.dataset.partnerId;
    wx.navigateTo({ url: '/pages/chat/chat?partnerId=' + partnerId });
  }
});