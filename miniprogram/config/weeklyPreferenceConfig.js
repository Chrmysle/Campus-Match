// config/weeklyPreferenceConfig.js — 本周搭子偏好配置（驱动级联选择）
// 新增搭子类型或子类别只需修改此文件

const WEEKLY_PREFERENCE_CONFIG = {
  version: '1.0.0',

  // 选择上限
  maxVibeTypes: 3,       // 最多选几种搭子类型
  maxSubCategories: 3,   // 每种类型最多选几个子类别

  // 搭子类型及其子类别
  vibeTypes: {
    study: {
      value: 'study',
      label: '学习/考研',
      emoji: '📚',
      color: '#C4D0E8',
      subCategories: [
        { value: 'postgrad', label: '考研备战', emoji: '🎓' },
        { value: 'finalExam', label: '期末复习', emoji: '📝' },
        { value: 'dailyStudy', label: '日常自习', emoji: '📖' },
        { value: 'coding', label: '编程/Coding', emoji: '💻' },
        { value: 'college', label: '所属学院', emoji: '🏛️' }
      ]
    },
    game: {
      value: 'game',
      label: '游戏上分',
      emoji: '🎮',
      color: '#E8C4C4',
      subCategories: [
        { value: 'wangzhe', label: '王者荣耀', emoji: '👑' },
        { value: 'lol', label: '英雄联盟', emoji: '⚔️' },
        { value: 'genshin', label: '原神/崩铁', emoji: '🌟' },
        { value: 'console', label: '主机/单机', emoji: '🎮' },
        { value: 'boardgame', label: '桌游/剧本杀', emoji: '🎲' }
      ]
    },
    fitness: {
      value: 'fitness',
      label: '健身运动',
      emoji: '💪',
      color: '#C4D4C4',
      subCategories: [
        { value: 'badminton', label: '羽毛球', emoji: '🏸' },
        { value: 'running', label: '跑步/散步', emoji: '🏃' },
        { value: 'swimming', label: '游泳', emoji: '🏊' },
        { value: 'ballGames', label: '篮球/足球', emoji: '🏀' },
        { value: 'gym', label: '健身/撸铁', emoji: '💪' },
        { value: 'yoga', label: '瑜伽/冥想', emoji: '🧘' }
      ]
    },
    entertainment: {
      value: 'entertainment',
      label: '逛街吃饭娱乐',
      emoji: '🍜',
      color: '#E8D4C4',
      subCategories: [
        { value: 'foodie', label: '探店/美食', emoji: '🍔' },
        { value: 'movie', label: '电影/剧集', emoji: '🎬' },
        { value: 'exhibition', label: '展览/博物馆', emoji: '🖼️' },
        { value: 'ktv', label: 'KTV/音乐', emoji: '🎤' },
        { value: 'shopping', label: '逛街/购物', emoji: '🛍️' }
      ]
    }
  },

  // 额外偏好设置（子类别之后的步骤）
  additionalPrefs: [
    {
      id: 'expectation',
      question: '你对搭子的期待更偏向？',
      emoji: '⚖️',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['技能互补型', '兴趣同频型']
    },
    {
      id: 'frequency',
      question: '你希望每周一起活动的频率？',
      emoji: '📅',
      type: 'select',
      options: [
        { value: 'daily', label: '每天都要见面 🤗' },
        { value: 'weekly2-3', label: '每周 2-3 次 👌' },
        { value: 'weekly1', label: '每周 1 次就够 👍' },
        { value: 'casual', label: '随缘，看心情 🍃' }
      ]
    }
  ],

  // 获取本周标签
  getWeekLabel: function () {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = Math.floor((now - jan1) / 86400000);
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return year + 'W' + week;
  },

  // 判断当前是否在匹配窗口内（周一 21:00 起）
  isInMatchWindow: function () {
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    // 周一 21:00 = day 1, minute 1260
    return day === 1 && minutes >= 1260;
  }
};

module.exports = WEEKLY_PREFERENCE_CONFIG;