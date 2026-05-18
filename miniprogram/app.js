// app.js — CampusLink 全局逻辑
App({
  onLaunch: function () {
    wx.cloud.init({
      env: 'cloud1-d5gxe2rvgf181e740',
      traceUser: true
    });

    this.globalData = {
      isVerified: false,
      userId: null,
      userInfo: null,
      userStatus: 'normal'
    };

    const cached = wx.getStorageSync('campusLink_user');
    if (cached && cached.isVerified) {
      this.globalData.isVerified = true;
      this.globalData.userId = cached.userId;
      this.globalData.userInfo = cached;
    }
  },

  checkVerification: function () {
    if (!this.globalData.isVerified) {
      wx.reLaunch({ url: '/pages/login/login' });
      return false;
    }
    return true;
  },

  setUserVerified: function (userInfo) {
    this.globalData.isVerified = true;
    this.globalData.userId = userInfo.userId || userInfo._id;
    this.globalData.userInfo = userInfo;

    // 合并云端数据与本地缓存，避免云端 null 覆盖本地已有值
    var cached = wx.getStorageSync('campusLink_user') || {};
    wx.setStorageSync('campusLink_user', {
      ...cached,
      ...userInfo,
      isVerified: true
    });
  },

  clearUser: function () {
    this.globalData.isVerified = false;
    this.globalData.userId = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('campusLink_user');
  }
});