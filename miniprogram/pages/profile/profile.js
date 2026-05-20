// pages/profile/profile.js — 个人中心
const QUIZ_CONFIG = require('../../config/quizConfig');
const { VIBE_THEMES } = require('../../config/vibeThemes');
const { COLLEGE_LIST, GRADE_OPTIONS, getGradeLabel } = require('../../config/collegeList');

Page({
  data: {
    isVerified: false,
    userInfo: null,
    bigFiveList: [],
    displayTags: [],
    facetList: [],
    vibeType: '',
    vibeLabel: '',
    editMode: false,
    editableTags: [],
    editingName: false,
    nameInput: '',
    editingContact: false,
    contactInput: '',
    isRealAvatar: false,
    uploadingAvatar: false,

    // 年级 & 学院
    gradeList: GRADE_OPTIONS,
    collegeList: COLLEGE_LIST.getFlatList(),
    editingGrade: false,
    editingCollege: false,
    gradeIndex: -1,
    collegeIndex: -1,
    gradeLabel: '',
    collegeLabel: '',
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
    let userInfo = wx.getStorageSync('campusLink_user') || {};
    const weeklyPref = wx.getStorageSync('campusLink_weeklyPref') || {};

    // 从云端拉取最新用户数据（aiSummary 是问卷提交后异步生成的，本地缓存可能没有）
    var that = this;
    var app = getApp();
    var userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'getUserProfile',
        data: { userId: userId }
      }).then(function (res) {
        if (res.result && res.result.success && res.result.data) {
          var cloudData = res.result.data;
          // 合并云端数据到本地缓存
          if (cloudData.aiSummary) {
            userInfo.aiSummary = cloudData.aiSummary;
            wx.setStorageSync('campusLink_user', userInfo);
            that.setData({ 'userInfo.aiSummary': cloudData.aiSummary });
          }
          // 如果云端有更新的 bigFive，也更新本地
          if (cloudData.bigFive) {
            var cachedBigFive = wx.getStorageSync('campusLink_quizResults') || {};
            cachedBigFive.bigFive = cloudData.bigFive;
            wx.setStorageSync('campusLink_quizResults', cachedBigFive);
            // 刷新大五人格条
            var bigFiveList = that.buildBigFiveList(cloudData.bigFive);
            that.setData({ bigFiveList: bigFiveList });
          }
          // 如果云端有 facet 数据
          if (cloudData.bigFiveFacets) {
            var cached = wx.getStorageSync('campusLink_quizResults') || {};
            cached.bigFiveFacets = cloudData.bigFiveFacets;
            wx.setStorageSync('campusLink_quizResults', cached);
            var facetList = that.buildFacetList(cloudData.bigFiveFacets);
            that.setData({ facetList: facetList });
          }
          // 同步年级和学院到本地
          if (cloudData.grade !== undefined || cloudData.college !== undefined) {
            userInfo.grade = cloudData.grade || 0;
            userInfo.college = cloudData.college || '';
            wx.setStorageSync('campusLink_user', userInfo);
            var newGradeIdx = -1;
            for (var gi2 = 0; gi2 < GRADE_OPTIONS.length; gi2++) {
              if (GRADE_OPTIONS[gi2].value === (cloudData.grade || 0)) { newGradeIdx = gi2; break; }
            }
            var newCollegeIdx = -1;
            var flatList2 = COLLEGE_LIST.getFlatList();
            for (var ci2 = 0; ci2 < flatList2.length; ci2++) {
              if (flatList2[ci2] === (cloudData.college || '')) { newCollegeIdx = ci2; break; }
            }
            that.setData({
              gradeIndex: newGradeIdx,
              collegeIndex: newCollegeIdx,
              gradeLabel: newGradeIdx >= 0 ? GRADE_OPTIONS[newGradeIdx].label : '未设置',
              collegeLabel: newCollegeIdx >= 0 ? flatList2[newCollegeIdx] : '未设置',
              'userInfo.grade': cloudData.grade || 0,
              'userInfo.college': cloudData.college || ''
            });
          }
        }
      }).catch(function (err) {
        console.warn('[profile] 云端拉取失败，使用本地缓存:', err);
      });
    }

    // 校区值 → 显示名称映射
    const campusMap = { xueyuanlu: '学院路校区', shahe: '沙河校区', other: '其他校区' };
    const campusDisplay = campusMap[quizResults.campus] || quizResults.campus || '学院路校区';

    // 年级 & 学院
    var gradeVal = userInfo.grade || 0;
    var collegeVal = userInfo.college || '';
    var gradeIdx = -1;
    for (var gi = 0; gi < GRADE_OPTIONS.length; gi++) {
      if (GRADE_OPTIONS[gi].value === gradeVal) { gradeIdx = gi; break; }
    }
    var collegeIdx = -1;
    var flatList = COLLEGE_LIST.getFlatList();
    for (var ci = 0; ci < flatList.length; ci++) {
      if (flatList[ci] === collegeVal) { collegeIdx = ci; break; }
    }

    // 不再从 quizResults 读取 vibeType（旧字段已废弃），改为本周偏好或留空
    var weeklyVibeTypes = [];
    var hasWeeklyPref = false;
    var WEEKLY_CONFIG = require('../../config/weeklyPreferenceConfig');
    if (weeklyPref && weeklyPref.weekLabel === WEEKLY_CONFIG.getWeekLabel()) {
      hasWeeklyPref = true;
      weeklyVibeTypes = weeklyPref.vibeTypes || [];
    }

    const tags = quizResults.tags || [];
    const bigFive = quizResults.bigFive || { N: 0.5, E: 0.5, O: 0.5, A: 0.5, C: 0.5 };

    // 判断是否为真实图片头像（cloud:// 开头）
    var avatar = userInfo.avatar || '👤';
    var isRealAvatar = typeof avatar === 'string' && avatar.indexOf('cloud://') === 0;

    const bigFiveList = this.buildBigFiveList(bigFive);
    const facetList = this.buildFacetList(quizResults.bigFiveFacets || {});

    this.setData({
      userInfo: {
        name: userInfo.name || '校园搭子',
        userId: userInfo.userId || userInfo.userid || '',
        email: userInfo.email || '***@buaa.edu.cn',
        campus: campusDisplay,
        schedule: quizResults.schedule || 'dayWalker',
        avatar: userInfo.avatar || '👤',
        contact: quizResults.contact || userInfo.contact || '',
        aiSummary: userInfo.aiSummary || '',
        grade: gradeVal,
        college: collegeVal
      },
      isRealAvatar: isRealAvatar,
      bigFiveList: bigFiveList,
      facetList: facetList,
      displayTags: tags,
      vibeType: '',
      vibeLabel: '',
      nameInput: userInfo.name || '校园搭子',
      gradeIndex: gradeIdx,
      collegeIndex: collegeIdx,
      gradeLabel: gradeIdx >= 0 ? GRADE_OPTIONS[gradeIdx].label : '未设置',
      collegeLabel: collegeIdx >= 0 ? flatList[collegeIdx] : '未设置',
      // 本周偏好
      hasWeeklyPref: hasWeeklyPref,
      weeklyVibeTypes: weeklyVibeTypes,
      weeklyPref: weeklyPref
    });
  },

  buildBigFiveList: function (bigFive) {
    const bigFiveLabels = { N: '情绪稳定性', E: '外向性', O: '开放性', A: '宜人性', C: '尽责性' };
    return Object.keys(bigFive).map(function (k) {
      var v = bigFive[k];
      // N (Neuroticism) 越高越神经质，显示为"情绪稳定性"时需要取反
      var displayVal = (k === 'N') ? (1 - v) : v;
      // 防止异常值导致负数或超过 100
      displayVal = Math.max(0, Math.min(1, displayVal));
      return {
        key: k,
        label: bigFiveLabels[k] || k,
        value: v,
        percent: (displayVal * 100).toFixed(1),
        width: (displayVal * 100)
      };
    });
  },

  /**
   * 构建 15 层面显示数据，按 domain 分组
   */
  buildFacetList: function (bigFiveFacets) {
    if (!bigFiveFacets || Object.keys(bigFiveFacets).length === 0) {
      // 兼容旧数据：没有 facet 数据时返回空
      return [];
    }

    const domainLabels = { N: '神经质', E: '外向性', O: '开放性', A: '宜人性', C: '尽责性' };
    const domains = ['N', 'E', 'O', 'A', 'C'];
    var result = [];

    domains.forEach(function (domain) {
      var facets = QUIZ_CONFIG.FACET_LIST.filter(function (f) {
        return QUIZ_CONFIG.FACET_DOMAIN[f] === domain;
      });

      // 跳过没有任何 facet 数据的 domain
      var hasData = facets.some(function (f) { return bigFiveFacets[f] !== undefined; });
      if (!hasData) return;

      var items = facets.map(function (facetKey) {
        var raw = bigFiveFacets[facetKey];
        if (raw === undefined) return null;
        var displayVal = Math.max(0, Math.min(1, raw));
        return {
          key: facetKey,
          label: QUIZ_CONFIG.FACET_LABELS[facetKey] || facetKey,
          percent: (displayVal * 100).toFixed(1),
          width: (displayVal * 100)
        };
      }).filter(function (item) { return item !== null; });

      result.push({
        domain: domain,
        domainLabel: domainLabels[domain] || domain,
        items: items
      });
    });

    return result;
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

  // ===== 头像上传 =====

  onUploadAvatar: function () {
    if (this.data.uploadingAvatar) return;

    var that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempPath = res.tempFilePaths[0];
        if (!tempPath) return;

        that.setData({ uploadingAvatar: true });
        wx.showLoading({ title: '上传头像...' });

        var app = getApp();
        var userId = app.globalData.userId;
        var ext = tempPath.match(/\.(\w+)$/);
        var suffix = (ext && ext[1]) || 'jpg';
        var cloudPath = 'avatars/' + userId + '/' + Date.now() + '.' + suffix;

        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempPath,
          success: function (upRes) {
            var fileID = upRes.fileID;
            console.log('[profile] avatar uploaded:', fileID);

            // 保存到本地
            var userInfo = wx.getStorageSync('campusLink_user') || {};
            userInfo.avatar = fileID;
            wx.setStorageSync('campusLink_user', userInfo);

            // 更新全局
            app.globalData.userInfo = userInfo;

            // 同步到云端
            wx.cloud.callFunction({
              name: 'updateUser',
              data: { userId: userId, fields: { avatar: fileID } },
              fail: function (err) {
                console.error('[profile] avatar cloud save failed:', err);
              }
            });

            wx.hideLoading();
            that.setData({
              uploadingAvatar: false,
              isRealAvatar: true,
              'userInfo.avatar': fileID
            });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
          fail: function (err) {
            console.error('[profile] avatar upload failed:', err);
            wx.hideLoading();
            that.setData({ uploadingAvatar: false });
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
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

  // ===== 联系方式编辑 =====

  onEditContact: function () {
    this.setData({
      editingContact: true,
      contactInput: this.data.userInfo.contact || ''
    });
  },

  onContactInput: function (e) {
    this.setData({ contactInput: e.detail.value });
  },

  onCancelEditContact: function () {
    this.setData({ editingContact: false });
  },

  onSaveContact: function () {
    var contact = (this.data.contactInput || '').trim();
    if (!contact) {
      wx.showToast({ title: '联系方式不能为空', icon: 'none' });
      return;
    }
    // 保存到本地
    var userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.contact = contact;
    wx.setStorageSync('campusLink_user', userInfo);
    // 同步到 quizResults
    var quizResults = wx.getStorageSync('campusLink_quizResults') || {};
    quizResults.contact = contact;
    wx.setStorageSync('campusLink_quizResults', quizResults);

    this.setData({
      editingContact: false,
      'userInfo.contact': contact
    });
    wx.showToast({ title: '联系方式已更新', icon: 'success' });

    // 同步到云端
    var app = getApp();
    var userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'updateUser',
        data: { userId: userId, fields: { contact: contact } },
        fail: function (err) {
          console.error('[profile] contact cloud save failed:', err);
        }
      });
    }
  },

  // ===== 修改个人信息（统一入口） =====

  onEditProfile: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['修改昵称', '修改年级', '修改学院', '修改联系方式'],
      success: function (res) {
        switch (res.tapIndex) {
          case 0:
            that.setData({
              editingName: true,
              nameInput: that.data.userInfo.name
            });
            break;
          case 1:
            that.setData({ editingGrade: true });
            break;
          case 2:
            that.setData({ editingCollege: true });
            break;
          case 3:
            that.setData({
              editingContact: true,
              contactInput: that.data.userInfo.contact || ''
            });
            break;
        }
      }
    });
  },

  onCancelAllEdit: function () {
    this.setData({
      editingName: false,
      editingGrade: false,
      editingCollege: false,
      editingContact: false
    });
  },

  // ===== 年级编辑 =====

  onEditGrade: function () {
    this.setData({ editingGrade: true });
  },

  onCancelEditGrade: function () {
    this.setData({ editingGrade: false });
  },

  onGradeChange: function (e) {
    this.setData({ gradeIndex: e.detail.value });
  },

  onSaveGrade: function () {
    var idx = this.data.gradeIndex;
    var value = idx >= 0 ? GRADE_OPTIONS[idx].value : 0;
    var label = idx >= 0 ? GRADE_OPTIONS[idx].label : '未设置';

    var userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.grade = value;
    wx.setStorageSync('campusLink_user', userInfo);

    this.setData({
      editingGrade: false,
      gradeLabel: label,
      'userInfo.grade': value
    });
    wx.showToast({ title: '年级已更新', icon: 'success' });

    var app = getApp();
    var userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'updateUser',
        data: { userId: userId, fields: { grade: value } },
        fail: function (err) { console.error('[profile] grade cloud save failed:', err); }
      });
    }
  },

  // ===== 学院编辑 =====

  onEditCollege: function () {
    this.setData({ editingCollege: true });
  },

  onCancelEditCollege: function () {
    this.setData({ editingCollege: false });
  },

  onCollegeChange: function (e) {
    this.setData({ collegeIndex: e.detail.value });
  },

  onSaveCollege: function () {
    var idx = this.data.collegeIndex;
    var flatList = COLLEGE_LIST.getFlatList();
    var value = idx >= 0 ? flatList[idx] : '';
    var label = idx >= 0 ? flatList[idx] : '未设置';

    var userInfo = wx.getStorageSync('campusLink_user') || {};
    userInfo.college = value;
    wx.setStorageSync('campusLink_user', userInfo);

    this.setData({
      editingCollege: false,
      collegeLabel: label,
      'userInfo.college': value
    });
    wx.showToast({ title: '学院已更新', icon: 'success' });

    var app = getApp();
    var userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'updateUser',
        data: { userId: userId, fields: { college: value } },
        fail: function (err) { console.error('[profile] college cloud save failed:', err); }
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
    const editableTags = this.data.editableTags.slice();
    editableTags.splice(idx, 1);
    this.setData({ editableTags });
  },

  onAddCustomTag: function () {
    const tags = this.data.editableTags.slice();
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

  getBigFiveLabel: function (key) {
    const map = { N: '情绪稳定性', E: '外向性', O: '开放性', A: '宜人性', C: '尽责性' };
    return map[key] || key;
  },

  onLogout: function () {
    var that = this;
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: function (res) {
        if (res.confirm) {
          // 清除登录态
          wx.removeStorageSync('campusLink_user');
          wx.removeStorageSync('campusLink_quizResults');
          wx.removeStorageSync('campusLink_weeklyPref');
          // 清除全局状态
          var app = getApp();
          app.globalData.isVerified = false;
          app.globalData.userId = '';
          app.globalData.userInfo = {};
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
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