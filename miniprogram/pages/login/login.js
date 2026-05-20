// pages/login/login.js — 校园邮箱登录 / 注册
const { COLLEGE_LIST, GRADE_OPTIONS } = require('../../config/collegeList');

Page({
  data: {
    mode: 'login',        // 'login' | 'register'
    email: '',
    password: '',
    confirmPwd: '',
    code: '',
    codeSent: false,
    countdown: 0,
    agreedToTerms: false,
    submitting: false,
    gender: 0,            // 0=不透露, 1=男, 2=女
    _latestCode: '',

    // 年级 & 学院
    gradeList: GRADE_OPTIONS,
    collegeList: COLLEGE_LIST.getFlatList(),
    gradeIndex: -1,
    collegeIndex: -1,
    gradeLabel: '请选择年级',
    collegeLabel: '请选择学院'
  },

  onLoad: function () {
    const app = getApp();
    if (app.globalData.isVerified) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // 切换 登录/注册 模式
  switchMode: function (e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode, code: '', codeSent: false, countdown: 0, submitting: false });
  },

  // ===== 输入事件 =====
  onEmailInput: function (e) {
    this.setData({ email: e.detail.value });
  },
  onPasswordInput: function (e) {
    this.setData({ password: e.detail.value });
  },
  onConfirmPwdInput: function (e) {
    this.setData({ confirmPwd: e.detail.value });
  },
  onCodeInput: function (e) {
    this.setData({ code: e.detail.value });
  },
  onAgreementChange: function (e) {
    this.setData({ agreedToTerms: e.detail.value.length > 0 });
  },

  onGenderSelect: function (e) {
    var value = parseInt(e.currentTarget.dataset.value);
    this.setData({ gender: value });
  },

  // ===== 年级 & 学院选择 =====
  onGradeChange: function (e) {
    var idx = e.detail.value;
    var option = GRADE_OPTIONS[idx];
    this.setData({ gradeIndex: idx, gradeLabel: option.label });
  },

  onCollegeChange: function (e) {
    var idx = e.detail.value;
    var list = COLLEGE_LIST.getFlatList();
    this.setData({ collegeIndex: idx, collegeLabel: list[idx] });
  },

  // ===== 发送验证码 =====
  onSendCode: function () {
    const { email, countdown } = this.data;
    if (countdown > 0) return;

    if (!email || !email.includes('@')) {
      wx.showToast({ title: '请输入有效的校园邮箱', icon: 'none' });
      return;
    }

    this.setData({ codeSent: true, countdown: 60 });

    wx.cloud.callFunction({
      name: 'sendVerificationCode',
      data: { email },
      success: res => {
        const result = res.result || {};
        if (result.success) {
          wx.showToast({ title: '验证码已发送到邮箱', icon: 'success' });
        } else {
          wx.showToast({ title: result.error || '发送失败', icon: 'none' });
          this.setData({ codeSent: false, countdown: 0 });
        }
      },
      fail: err => {
        console.error('[login] sendCode error:', err);
        wx.showToast({ title: '网络错误, 请重试', icon: 'none' });
        this.setData({ codeSent: false, countdown: 0 });
      }
    });

    const timer = setInterval(() => {
      const cd = this.data.countdown - 1;
      this.setData({ countdown: cd });
      if (cd <= 0) clearInterval(timer);
    }, 1000);
  },

  // ===== 登录 =====
  onLogin: function () {
    const { email, password } = this.data;

    if (!email || !password) {
      wx.showToast({ title: '请输入邮箱和密码', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    wx.cloud.callFunction({
      name: 'loginUser',
      data: { email, password },
      success: res => {
        const result = res.result || {};
        if (result.success) {
          const app = getApp();
          app.setUserVerified(result.user);
          wx.showToast({ title: '登录成功 🎉', icon: 'success' });
          setTimeout(() => {
            // 优先用云端问卷结果，其次本地缓存
            let quizDone = wx.getStorageSync('campusLink_quizResults');
            if (!quizDone || !quizDone.bigFive) {
              if (result.user.quizResults && result.user.quizDone) {
                wx.setStorageSync('campusLink_quizResults', result.user.quizResults);
                quizDone = result.user.quizResults;
              }
            }
            if (quizDone && quizDone.bigFive) {
              wx.switchTab({ url: '/pages/index/index' });
            } else {
              wx.reLaunch({ url: '/pages/quiz/quiz' });
            }
          }, 600);
        } else {
          wx.showToast({ title: result.error || '登录失败', icon: 'none' });
          this.setData({ submitting: false });
        }
      },
      fail: err => {
        console.error('[login] login error:', err);
        wx.showToast({ title: '网络错误, 请重试', icon: 'none' });
        this.setData({ submitting: false });
      }
    });
  },

  // ===== 注册 =====
  onRegister: function () {
    const { email, code, password, confirmPwd, agreedToTerms, gender, gradeIndex, collegeIndex } = this.data;

    if (!agreedToTerms) {
      wx.showToast({ title: '请先同意用户协议', icon: 'none' });
      return;
    }
    if (!email || !code || !password || !confirmPwd) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }
    if (password !== confirmPwd) {
      wx.showToast({ title: '两次密码输入不一致', icon: 'none' });
      return;
    }

    var grade = gradeIndex >= 0 ? GRADE_OPTIONS[gradeIndex].value : 0;
    var college = collegeIndex >= 0 ? COLLEGE_LIST.getFlatList()[collegeIndex] : '';

    this.setData({ submitting: true });

    wx.cloud.callFunction({
      name: 'registerUser',
      data: { email, code, password, gender: gender, grade: grade, college: college },
      success: res => {
        const result = res.result || {};
        if (result.success) {
          const app = getApp();
          app.setUserVerified(result.user);
          wx.showToast({ title: '注册成功 🎉', icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/quiz/quiz' });
          }, 600);
        } else {
          wx.showToast({ title: result.error || '注册失败', icon: 'none' });
          this.setData({ submitting: false });
        }
      },
      fail: err => {
        console.error('[login] register error:', err);
        wx.showToast({ title: '网络错误, 请重试', icon: 'none' });
        this.setData({ submitting: false });
      }
    });
  }
});