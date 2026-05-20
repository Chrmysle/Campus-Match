// pages/quiz/quiz.js — 动态问卷容器页
const QUIZ_CONFIG = require('../../config/quizConfig');

Page({
  data: {
    currentStage: 0,
    stages: QUIZ_CONFIG.stages,
    currentQuestions: [],
    currentQIndex: 0,
    currentQ: null,
    answers: {},
    progress: 0,
    totalQuestions: 0,
    stageProgress: 0,
    stageTotal: 0,
    isLastQ: false,
    isLastStage: false,
    textLength: 0
  },

  onLoad: function () {
    const app = getApp();
    if (!app.checkVerification()) return;

    const firstStage = QUIZ_CONFIG.stages[0];
    const questions = this.getStageQuestions(firstStage.key);
    const total = this.countAllQuestions();

    this.setData({
      totalQuestions: total,
      currentQuestions: questions,
      stageTotal: questions.length,
      currentQ: questions[0],
      currentQIndex: 0,
      isLastStage: QUIZ_CONFIG.stages.length === 1
    }, () => this.initCurrentAnswer(questions[0]));

    console.log('[quiz] loaded stage:', firstStage.key, 'questions:', questions.length, 'total:', total);
  },

  getStageQuestions: function (stageKey) {
    switch (stageKey) {
      case 'personality': return QUIZ_CONFIG.personalityQuestions;
      case 'schedule': return QUIZ_CONFIG.scheduleQuestions;
      case 'extras': return QUIZ_CONFIG.extrasQuestions;
      default: return [];
    }
  },

  countAllQuestions: function () {
    let count = 0;
    QUIZ_CONFIG.stages.forEach(s => {
      count += this.getStageQuestions(s.key).length;
    });
    return count;
  },

  getAnsweredCount: function () {
    return Object.keys(this.data.answers).length;
  },

  // 当加载新题目时，初始化 slider 默认值
  initCurrentAnswer: function (q) {
    if (!q) return;
    if (q.type === 'slider' && this.data.answers[q.id] === undefined) {
      const answers = { ...this.data.answers, [q.id]: q.min !== undefined ? Math.floor((q.min + q.max) / 2) : 50 };
      this.setData({ answers });
    }
  },

  onSliderChange: function (e) {
    const { id } = e.currentTarget.dataset;
    const value = e.detail.value;
    const answers = { ...this.data.answers, [id]: value };
    this.setData({
      answers,
      progress: this.getAnsweredCount()
    });
    console.log('[quiz] slider:', id, '=', value);
  },

  onSelect: function (e) {
    const { id, value } = e.currentTarget.dataset;
    const answers = { ...this.data.answers, [id]: value };
    this.setData({
      answers,
      progress: this.getAnsweredCount()
    });
    console.log('[quiz] select:', id, '=', value);
  },

  onMultiSelectToggle: function (e) {
    const { id, value } = e.currentTarget.dataset;
    const current = this.data.answers[id] || [];
    const idx = current.indexOf(value);
    let next;
    const maxSelect = this.data.currentQ.maxSelect || 99;
    if (idx > -1) {
      next = current.filter(v => v !== value);
    } else {
      if (current.length >= maxSelect) {
        wx.showToast({ title: '最多选' + maxSelect + '个', icon: 'none' });
        return;
      }
      next = current.concat([value]);
    }
    const answers = Object.assign({}, this.data.answers, { [id]: next });
    this.setData({ answers, progress: this.getAnsweredCount() });
    console.log('[quiz] multiSelect:', id, '=', next);
  },

  onTextInput: function (e) {
    const { id } = e.currentTarget.dataset;
    const value = e.detail.value;
    const answers = { ...this.data.answers, [id]: value };
    this.setData({ answers, progress: this.getAnsweredCount() });
  },

  onNext: function () {
    if (this.data._processing) return;
    const { currentQIndex, currentQuestions, answers, currentQ } = this.data;

    // 根据题目类型做验证
    if (currentQ.type !== 'textInput' && currentQ.type !== 'slider') {
      if (!answers[currentQ.id] || (Array.isArray(answers[currentQ.id]) && answers[currentQ.id].length === 0)) {
        wx.showToast({ title: '请先完成本题', icon: 'none' });
        return;
      }
    }
    if (currentQIndex < currentQuestions.length - 1) {
      this.setData({ _processing: true });
      const nextIdx = currentQIndex + 1;
      const nextQ = currentQuestions[nextIdx];
      this.setData({
        currentQIndex: nextIdx,
        currentQ: nextQ,
        isLastQ: nextIdx === currentQuestions.length - 1 && this.data.isLastStage
      }, () => {
        this.initCurrentAnswer(nextQ);
        this.setData({ _processing: false });
      });
    } else {
      this.goNextStage();
    }
  },

  goNextStage: function () {
    const { currentStage, stages } = this.data;
    if (currentStage < stages.length - 1) {
      const nextStage = currentStage + 1;
      const questions = this.getStageQuestions(stages[nextStage].key);
      const isLastStage = nextStage === stages.length - 1;
      const firstQ = questions[0];
      this.setData({
        currentStage: nextStage,
        currentQuestions: questions,
        stageTotal: questions.length,
        currentQIndex: 0,
        currentQ: firstQ,
        isLastStage,
        isLastQ: questions.length === 1 && isLastStage
      }, () => this.initCurrentAnswer(firstQ));
    } else {
      this.submitQuiz();
    }
  },

  onPrev: function () {
    const { currentQIndex } = this.data;
    if (currentQIndex > 0) {
      const prevIdx = currentQIndex - 1;
      const prevQ = this.data.currentQuestions[prevIdx];
      this.setData({
        currentQIndex: prevIdx,
        currentQ: prevQ,
        isLastQ: false
      }, () => {
        this.initCurrentAnswer(prevQ);
        this.setData({ _processing: false });
      });
    }
  },

  submitQuiz: function () {
    console.log('[quiz] submitting answers:', this.data.answers);
    wx.showLoading({ title: '生成你的画像...' });

    const results = this.computeResults();
    wx.setStorageSync('campusLink_quizResults', results);

    // 同步到云数据库（跨设备持久化）
    const app = getApp();
    const userId = app.globalData.userId;
    if (userId) {
      wx.cloud.callFunction({
        name: 'saveQuizResults',
        data: { userId, quizResults: results },
        success: function () {
          console.log('[quiz] cloud save succeeded');
          // 触发 AI 摘要生成（含降级方案）
          wx.cloud.callFunction({
            name: 'generateAiSummary',
            data: { userId, quizData: results, bio: results.rawAnswers?.x2 || '' }
          });
        },
        fail: function (err) {
          console.error('[quiz] cloud save failed:', err);
          wx.showToast({ title: '云端保存失败，本地已保存', icon: 'none' });
        }
      });
    }

    setTimeout(() => {
      wx.hideLoading();
      wx.switchTab({ url: '/pages/index/index' });
    }, 800);
  },

  computeResults: function () {
    const { answers } = this.data;

    // 1. 计算 facet 层面得分（0-1）
    //    select 型选项值已是 0~1，slider 需 ÷100
    const bigFiveFacets = {};
    QUIZ_CONFIG.personalityQuestions.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined) {
        const norm = q.type === 'slider' ? val / 100 : parseFloat(val);
        bigFiveFacets[q.facet] = Math.max(0, Math.min(1, norm));
      }
    });

    // 2. 计算 domain 得分：所属 facet 的平均值
    const bigFive = { N: 0, E: 0, O: 0, A: 0, C: 0 };
    const facetCounts = { N: 0, E: 0, O: 0, A: 0, C: 0 };
    QUIZ_CONFIG.FACET_LIST.forEach(function (facetKey) {
      const domain = QUIZ_CONFIG.FACET_DOMAIN[facetKey];
      if (bigFiveFacets[facetKey] !== undefined) {
        bigFive[domain] += bigFiveFacets[facetKey];
        facetCounts[domain]++;
      }
    });
    Object.keys(bigFive).forEach(function (k) {
      bigFive[k] = facetCounts[k] > 0
        ? Math.round((bigFive[k] / facetCounts[k]) * 100) / 100
        : 0.5;
    });

    // 3. 标签
    const tags = [];
    Object.keys(QUIZ_CONFIG.tagMappings).forEach(key => {
      const m = QUIZ_CONFIG.tagMappings[key];
      if (m.questionId && answers[m.questionId] === m.value) {
        tags.push({ type: 'primary', key, emoji: m.emoji, label: m.label });
      }
      if (m.threshold && answers[m.questionId] !== undefined) {
        if (m.threshold > 50 && answers[m.questionId] >= m.threshold) {
          tags.push({ type: 'primary', key, emoji: m.emoji, label: m.label });
        }
      }
    });

    const schedule = answers['s1'] || 'dayWalker';
    const campus = answers['s2'] || 'xueyuanlu';
    const contact = answers['x3'] || '';

    return { bigFive, bigFiveFacets, tags, schedule, campus, contact, rawAnswers: answers };
  }
});