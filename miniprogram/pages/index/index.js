// pages/index/index.js — 匹配大厅（简化版：放榜即显示联系方式）
const { VIBE_THEMES } = require('../../config/vibeThemes');
const WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');

const FACET_LABELS = {
  N_Anxiety: '焦虑', N_Vulnerability: '脆弱', N_Impulsiveness: '冲动',
  E_Gregariousness: '合群', E_Assertiveness: '主见', E_Warmth: '热情',
  O_Ideas: '求是', O_Actions: '探索', O_Aesthetics: '审美',
  A_Trust: '信任', A_Altruism: '利他', A_Compliance: '顺从',
  C_Order: '条理', C_Achievement: '上进', C_SelfDiscipline: '自律'
};

// 匹配解读降级方案（前端直接生成，无需等待云端 AI）
function buildFallbackInsight(candidate) {
  var pct = Math.round((candidate.personalitySim || 0.7) * 100);
  var topText = '';
  if (candidate.highlightTags && candidate.highlightTags.length > 0) {
    topText = candidate.highlightTags.slice(0, 2).map(function (t) { return t.label || t.key; }).join('、');
  }
  var reason = '人格契合度 ' + pct + '%，' + (topText ? '在「' + topText + '」等方面兴趣相投。' : '算法推荐你们成为本周搭子！');
  var personalityText = '你们的大五人格余弦相似度为 ' + pct + '%。';

  var iceBreakers = [];
  if (candidate.sharedTags) {
    iceBreakers.push('你们都有「' + candidate.sharedTags + '」的共同点，不妨从共同兴趣聊起！');
  }
  if (candidate.sharedSubCategories && candidate.sharedSubCategories.length > 0) {
    var subLabels = candidate.sharedSubCategories.map(function (s) { return s.label || s.value; });
    iceBreakers.push('发现你们都关注「' + subLabels.slice(0, 2).join('」、「') + '」，约起来吧！');
  }
  if (iceBreakers.length === 0) {
    iceBreakers.push('缘分让你们相遇，主动打个招呼开启一段新友谊吧 ✨');
    iceBreakers.push('分享一首你最近在循环的歌，看看对方是否也喜欢 💫');
  }
  if (iceBreakers.length < 2) {
    iceBreakers.push('分享一首你最近在循环的歌，看看对方是否也喜欢 💫');
  }

  return {
    matchReason: reason,
    similarities: {
      personality: personalityText,
      tags: candidate.sharedTags ? candidate.sharedTags.split('、') : [],
      subCategories: [],
      scheduleSync: candidate.scheduleSync || false,
      campusLink: candidate.campusLink || false
    },
    iceBreakers: iceBreakers.slice(0, 2),
    aiGenerated: false
  };
}

Page({
  data: {
    isVerified: false,
    hasQuizData: false,
    homepageState: 'loading',
    weeklySubmitted: false,
    weeklyPref: null,
    weeklyVibeTypes: [],
    displayTags: [],
    userPersonality: null,
    userSchedule: '',
    userCampus: '',

    countdownText: '',
    countdownLabel: '',
    nextMatchTime: '',
    currentVibe: '',
    vibeTypes: [],
    vibeThemeList: [],
    vibeTheme: null,

    candidates: [],

    defaultEmoji: '🎯',
    defaultAvatar: '👤',

    showDevTools: false,
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
    this.initHomepage();
  },

  // ===== 主页状态管理 =====

  initHomepage: function () {
    var quizResults = wx.getStorageSync('campusLink_quizResults') || {};
    var hasQuizData = !!(quizResults.bigFive);
    this.setData({ hasQuizData: hasQuizData });

    // 先尝试从云端同步匹配状态到本地缓存
    this.syncMatchStatusFromCloud();

    var matched = this.checkCloudMatchStatus();
    this.checkWeeklyPrefStatus();
    this.checkTimeline();
    this.loadPersonalityPreview();
  },

  // 从云端拉取最新状态并同步到本地缓存
  syncMatchStatusFromCloud: function () {
    var that = this;
    var app = getApp();
    var userId = app.globalData.userId;
    if (!userId) return;

    wx.cloud.callFunction({
      name: 'getUserProfile',
      data: { userId: userId },
      success: function (res) {
        if (res.result && res.result.success && res.result.data) {
          var cloudData = res.result.data;
          if (cloudData.weeklyMatchStatus) {
            var userInfo = wx.getStorageSync('campusLink_user') || {};
            userInfo.weeklyMatchStatus = cloudData.weeklyMatchStatus;
            userInfo.weeklyMatchWeekLabel = cloudData.weeklyMatchWeekLabel || '';
            wx.setStorageSync('campusLink_user', userInfo);
            // 重新检查状态
            that.checkCloudMatchStatus();
          }
        }
      },
      fail: function () {
        // 静默失败，使用本地缓存
      }
    });
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

  // 从云端登录信息读取匹配状态
  checkCloudMatchStatus: function () {
    var userInfo = wx.getStorageSync('campusLink_user') || {};
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    var status = userInfo.weeklyMatchStatus;
    var statusWeek = userInfo.weeklyMatchWeekLabel;

    if (!status || statusWeek !== weekLabel) return false;

    // completed 或 voting（voting 在简化版中等同于 completed）→ 直接加载匹配结果
    if ((status === 'completed' || status === 'voting') && statusWeek === weekLabel) {
      this.setData({ weeklySubmitted: true });
      this.loadMatchPool();
      return true;
    }

    if (status === 'submitted' && statusWeek === weekLabel) {
      this.setData({ weeklySubmitted: true });
      if (WEEKLY_CONFIG.isRevealed()) {
        this.loadMatchPool();
      } else if (WEEKLY_CONFIG.isProcessing()) {
        this.setData({ homepageState: 'processing' });
      } else {
        this.setData({ homepageState: 'waiting' });
      }
      return true;
    }

    return false;
  },

  determineHomepageState: function () {
    if (this.data.homepageState === 'completed' || this.data.homepageState === 'processing') return;

    if (this.data.weeklySubmitted) {
      this.setData({ homepageState: 'waiting' });
    } else if (!WEEKLY_CONFIG.isSubmissionOpen()) {
      this.setData({ homepageState: 'closed' });
    } else if (this.data.hasQuizData) {
      this.setData({ homepageState: 'dashboard' });
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
    var quizResults = wx.getStorageSync('campusLink_quizResults');
    if (!quizResults || !quizResults.bigFive) {
      var userInfo = wx.getStorageSync('campusLink_user') || {};
      if (userInfo.quizResults && userInfo.quizResults.bigFive) {
        quizResults = userInfo.quizResults;
        wx.setStorageSync('campusLink_quizResults', quizResults);
      }
    }
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

  // ===== 时间线状态 =====

  checkTimeline: function () {
    if (WEEKLY_CONFIG.isRevealed() && this.data.homepageState === 'waiting') {
      this.loadMatchPool();
    } else {
      this.updateCountdown();
    }
    this.determineHomepageState();
  },

  updateCountdown: function () {
    var now = new Date();
    var target;
    var label = '';

    if (this.data.homepageState === 'processing' || WEEKLY_CONFIG.isProcessing()) {
      target = new Date(now);
      if (now.getDay() === 1) {
        target.setHours(21, 0, 0, 0);
      } else {
        target = WEEKLY_CONFIG.getNextRevealTime();
      }
      label = '距放榜还有';
    } else if (!WEEKLY_CONFIG.isSubmissionOpen()) {
      target = WEEKLY_CONFIG.getNextRevealTime();
      label = '距下次匹配还有';
    } else {
      target = WEEKLY_CONFIG.getNextSubmissionDeadline();
      label = '距提交截止还有';
    }

    var diff = target - now;
    if (diff <= 0) {
      this.setData({ countdownText: '即将开始！', countdownLabel: '' });
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var text = '';
    if (d > 0) text += d + '天 ';
    text += h + '小时 ' + m + '分钟';
    this.setData({ countdownText: text, countdownLabel: label, nextMatchTime: target.toLocaleString('zh-CN') });
    if (this._countdownTimer) clearTimeout(this._countdownTimer);
    this._countdownTimer = setTimeout(this.updateCountdown.bind(this), 60000);
  },

  // ===== 匹配结果加载 & 联系方式展示 =====

  loadMatchPool: function () {
    var app = getApp();
    var userId = app.globalData.userId;
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
    var that = this;

    if (!userId || !weekLabel) {
      this.setData({ weeklySubmitted: true, homepageState: 'waiting' });
      return;
    }

    wx.cloud.callFunction({
      name: 'getMyMatchPool',
      data: { userId: userId, weekLabel: weekLabel },
      success: function (res) {
        if (res.result && res.result.success && res.result.pool && res.result.pool.revealed) {
          that._displayMatches(res.result.pool);
        } else if (res.result && res.result.success && res.result.pool) {
          // match_pool 存在但未揭晓
          if (WEEKLY_CONFIG.isProcessing()) {
            that.setData({ weeklySubmitted: true, homepageState: 'processing' });
          } else {
            that.setData({ weeklySubmitted: true, homepageState: 'waiting' });
          }
        } else {
          // 没有匹配池
          that.setData({ weeklySubmitted: true, homepageState: 'waiting' });
        }
      },
      fail: function (err) {
        console.error('[index] loadMatchPool error:', err);
        that.setData({ weeklySubmitted: true, homepageState: 'waiting' });
      }
    });
  },

  _displayMatches: function (pool) {
    var that = this;
    var app = getApp();
    var userId = app.globalData.userId;
    var weekLabel = WEEKLY_CONFIG.getWeekLabel();
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

    var candidates = pool.candidates || [];

    // 为每个候选人生成本地降级匹配解读（秒出，不依赖云端）
    candidates.forEach(function (c) {
      if (!c.matchInsight) {
        c.matchInsight = buildFallbackInsight(c);
      }
    });

    that.setData({
      currentVibe: vibeTypes[0],
      vibeTypes: vibeTypes,
      vibeThemeList: vibeThemeList,
      vibeTheme: vibeTheme,
      candidates: candidates,
      homepageState: 'completed'
    });

    // 异步拉取每个候选人的联系方式
    candidates.forEach(function (c) {
      wx.cloud.callFunction({
        name: 'getUserProfile',
        data: { userId: c.candidateId },
        success: function (res) {
          if (res.result && res.result.success && res.result.data) {
            var contact = res.result.data.contact || '';
            // 更新对应候选人的联系方式
            var list = that.data.candidates.slice();
            for (var i = 0; i < list.length; i++) {
              if (list[i].candidateId === c.candidateId) {
                list[i].contact = contact;
                that.setData({ candidates: list });
                break;
              }
            }
          }
        }
      });
    });

    // 懒加载 AI 增强版匹配解读（可选，超时不影响显示）
    candidates.forEach(function (c) {
      if (c.matchInsight && c.matchInsight.aiGenerated) return;
      wx.cloud.callFunction({
        name: 'generateMatchInsights',
        data: { userId: userId, candidateId: c.candidateId, weekLabel: weekLabel },
        config: { timeout: 15000 },
        success: function (res) {
          if (res.result && res.result.success && res.result.insight) {
            var list = that.data.candidates.slice();
            for (var i = 0; i < list.length; i++) {
              if (list[i].candidateId === c.candidateId) {
                list[i].matchInsight = res.result.insight;
                that.setData({ candidates: list });
                break;
              }
            }
          }
        },
        fail: function (err) {
          console.warn('[index] generateMatchInsights fail:', err);
        }
      });
    });
  },

  // ===== 开发工具 =====

  onCopyContact: function (e) {
    var contact = e.currentTarget.dataset.contact;
    if (!contact) return;
    wx.setClipboardData({
      data: contact,
      success: function () {
        wx.showToast({ title: '已复制微信号', icon: 'success' });
      }
    });
  },

  onTriggerMatchEngine: function () {
    var that = this;
    wx.showModal({
      title: '触发匹配引擎',
      content: '匹配将在后台异步执行，请确认已到截止时间（18:00）',
      confirmText: '确认触发',
      success: function (modalRes) {
        if (!modalRes.confirm) return;
        wx.showLoading({ title: '已提交，后台运行中...' });
        wx.cloud.callFunction({
          name: 'weeklyMatchEngine',
          data: {},
          success: function () {
            wx.hideLoading();
            wx.showToast({ title: '匹配引擎已启动' });
            that.initHomepage();
          },
          fail: function (err) {
            wx.hideLoading();
            // 超时是预期的——引擎在后台继续跑
            if (err.errCode === -504003 || err.errMsg.indexOf('timeout') > -1) {
              wx.showToast({ title: '匹配已触发，正在后台计算' });
              that.initHomepage();
            } else {
              wx.showToast({ title: '触发失败', icon: 'none' });
            }
          }
        });
      }
    });
  },

  onTriggerReveal: function () {
    var that = this;
    wx.showLoading({ title: '触发放榜...' });
    wx.cloud.callFunction({
      name: 'revealMatch',
      data: {},
      success: function (res) {
        wx.hideLoading();
        var result = res.result || {};
        if (result.success) {
          var weekLabel = WEEKLY_CONFIG.getWeekLabel();
          var userInfo = wx.getStorageSync('campusLink_user') || {};
          userInfo.weeklyMatchStatus = 'completed';
          userInfo.weeklyMatchWeekLabel = weekLabel;
          wx.setStorageSync('campusLink_user', userInfo);

          wx.showModal({
            title: '放榜完成',
            content: '已揭晓 ' + (result.poolsRevealed || 0) + ' 个匹配池',
            confirmText: '好的'
          });
          that.initHomepage();
        } else {
          wx.showToast({ title: result.error || '放榜失败', icon: 'none' });
        }
      },
      fail: function (err) {
        wx.hideLoading();
        console.error('[index] revealMatch error:', err);
        // 超时是预期的——引擎在后台继续跑
        if (err.errCode === -504003 || (err.errMsg && err.errMsg.indexOf('timeout') > -1)) {
          wx.showToast({ title: '放榜已触发，正在后台执行' });
          that.initHomepage();
        } else {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  onToggleDevTools: function () {
    this.setData({ showDevTools: !this.data.showDevTools });
  }
});