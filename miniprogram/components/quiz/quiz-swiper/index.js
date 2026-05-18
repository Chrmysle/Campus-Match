// components/quiz/quiz-swiper/index.js
// 动态卡片切题组件 — 完全配置驱动，无硬编码题目
const QUIZ_CONFIG = require('../../../config/quizConfig');

Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  properties: {
    stageKey: { type: String, value: 'personality' },
    autoNext: { type: Boolean, value: false }
  },
  data: {
    questions: [],
    currentIndex: 0,
    currentQ: null,
    answers: {},
    totalInStage: 0,
    isLast: false,
    animOut: false
  },
  lifetimes: {
    attached: function () {
      this.loadQuestions();
    }
  },
  observers: {
    'stageKey': function (newKey) {
      if (newKey) this.loadQuestions();
    }
  },
  methods: {
    loadQuestions: function () {
      let questions = [];
      switch (this.data.stageKey) {
        case 'personality': questions = QUIZ_CONFIG.personalityQuestions; break;
        case 'schedule': questions = QUIZ_CONFIG.scheduleQuestions; break;
        case 'vibe': questions = QUIZ_CONFIG.vibeQuestions.filter(q => !q.branchFrom); break;
        case 'extras': questions = QUIZ_CONFIG.extrasQuestions; break;
      }
      this.setData({
        questions,
        totalInStage: questions.length,
        currentIndex: 0,
        currentQ: questions[0] || null,
        isLast: questions.length <= 1,
        answers: {}
      });
      console.log('[quiz-swiper] loaded', questions.length, 'questions for stage:', this.data.stageKey);
    },

    // Slider 变化
    onSliderChange: function (e) {
      const id = this.data.currentQ.id;
      const value = e.detail.value;
      this.updateAnswer(id, value);
      this.triggerEvent('answer', { questionId: id, value, stage: this.data.stageKey });
    },

    // 单选
    onSelect: function (e) {
      const { value } = e.currentTarget.dataset;
      const id = this.data.currentQ.id;
      this.updateAnswer(id, value);
      this.triggerEvent('answer', { questionId: id, value, stage: this.data.stageKey });
      if (this.data.autoNext) {
        setTimeout(() => this.goNext(), 200);
      }
    },

    // 多选切换
    onMultiToggle: function (e) {
      const { value } = e.currentTarget.dataset;
      const id = this.data.currentQ.id;
      const current = this.data.answers[id] || [];
      const maxSelect = this.data.currentQ.maxSelect || 99;
      let next;
      const idx = current.indexOf(value);
      if (idx > -1) {
        next = current.filter(v => v !== value);
      } else {
        if (current.length >= maxSelect) {
          wx.showToast({ title: '最多选' + maxSelect + '个', icon: 'none' });
          return;
        }
        next = [...current, value];
      }
      this.updateAnswer(id, next);
      this.triggerEvent('answer', { questionId: id, value: next, stage: this.data.stageKey });
    },

    // 文本输入
    onTextInput: function (e) {
      const id = this.data.currentQ.id;
      this.updateAnswer(id, e.detail.value);
    },

    onTextBlur: function (e) {
      const id = this.data.currentQ.id;
      this.triggerEvent('answer', { questionId: id, value: e.detail.value, stage: this.data.stageKey });
    },

    updateAnswer: function (id, value) {
      const answers = { ...this.data.answers, [id]: value };
      this.setData({ answers });
    },

    // 下一题
    goNext: function () {
      const { currentIndex, questions, answers, currentQ } = this.data;
      if (!answers[currentQ.id] && currentQ.type !== 'textInput') {
        wx.showToast({ title: '请先完成本题', icon: 'none' });
        return;
      }
      if (currentIndex < questions.length - 1) {
        this.animateOut(() => {
          const nextIdx = currentIndex + 1;
          this.setData({
            currentIndex: nextIdx,
            currentQ: questions[nextIdx],
            isLast: nextIdx === questions.length - 1,
            animOut: false
          });
        });
      } else {
        this.triggerEvent('stageComplete', {
          stage: this.data.stageKey,
          answers: this.data.answers
        });
      }
    },

    // 上一题
    goPrev: function () {
      const { currentIndex, questions } = this.data;
      if (currentIndex > 0) {
        const prevIdx = currentIndex - 1;
        this.setData({
          currentIndex: prevIdx,
          currentQ: questions[prevIdx],
          isLast: false
        });
      }
    },

    // 切题动画
    animateOut: function (callback) {
      this.setData({ animOut: true });
      setTimeout(() => {
        callback && callback();
      }, 200);
    },

    // 获取当前阶段所有答案
    getAnswers: function () {
      return this.data.answers;
    }
  }
});