// config/quizConfig.js — 问卷字典（完全配置驱动）
// 所有题目、选项、Emoji、分支逻辑均在此定义

const QUIZ_CONFIG = {
  version: '1.0.0',

  // 阶段定义
  stages: [
    { key: 'personality', title: '性格画像', subtitle: '先认识一下你自己', icon: '🎨' },
    { key: 'schedule', title: '作息节奏', subtitle: '时间对了，搭子才对', icon: '⏰' },
    { key: 'extras', title: '趣味加分', subtitle: '让算法更懂你', icon: '✨' }
  ],

  // ===== 阶段 1：人格特质题目（映射 Big Five） =====
  personalityQuestions: [
    {
      id: 'p1',
      question: '在聚会中，你通常是那个带动气氛的人',
      emoji: '🎤',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['完全不像我', '这就是我'],
      bigFiveMap: { E: 1.0 }
    },
    {
      id: 'p2',
      question: '你习惯提前规划每天的任务，而不是想到什么做什么',
      emoji: '📋',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['随性而为', '计划至上'],
      bigFiveMap: { C: 1.0 }
    },
    {
      id: 'p3',
      question: '你容易因为小事感到焦虑或烦躁',
      emoji: '🌊',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['稳如老狗', '容易波动'],
      bigFiveMap: { N: 1.0 }
    },
    {
      id: 'p4',
      question: '你对新事物充满好奇，喜欢尝试不同的体验',
      emoji: '🔍',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['偏爱熟悉', '热爱尝鲜'],
      bigFiveMap: { O: 1.0 }
    },
    {
      id: 'p5',
      question: '团队合作中，你更倾向照顾他人感受而非坚持己见',
      emoji: '🤝',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['坚持原则', '以和为贵'],
      bigFiveMap: { A: 1.0 }
    },
    {
      id: 'p6',
      question: '遇到挫折时，你能快速调整心态继续前进',
      emoji: '🧘',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['容易emo', '秒速回血'],
      bigFiveMap: { N: -1.0 }
    },
    {
      id: 'p7',
      question: '你更喜欢与一群人热闹相处，而非独自安静待着',
      emoji: '🎉',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['独处充电', '人群充能'],
      bigFiveMap: { E: 1.0 }
    },
    {
      id: 'p8',
      question: '你会主动探索新的学习方法或工具来提高效率',
      emoji: '💡',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['够用就行', '效率狂魔'],
      bigFiveMap: { O: 0.7, C: 0.3 }
    }
  ],

  // ===== 阶段 2：作息与校区（硬过滤依据） =====
  scheduleQuestions: [
    {
      id: 's1',
      question: '你通常的作息类型是？',
      emoji: '🌅',
      type: 'select',
      options: [
        { value: 'earlyBird', label: '早起鸟 🦅', sub: '6:00-7:00起床，22:30前睡' },
        { value: 'dayWalker', label: '日行者 ☀️', sub: '8:00-9:00起床，23:30前睡' },
        { value: 'nightOwl', label: '夜猫子 🦉', sub: '0:00后睡，上午没课就赖床' },
        { value: 'chaotic', label: '混乱中立 🌀', sub: '作息随DDL变化而剧烈波动' }
      ]
    },
    {
      id: 's2',
      question: '你所在的校区是？',
      emoji: '📍',
      type: 'select',
      options: [
        { value: 'xueyuanlu', label: '学院路校区' },
        { value: 'shahe', label: '沙河校区' },
        { value: 'other', label: '其他校区' }
      ]
    },
    {
      id: 's3',
      question: '你通常的学习/活动高峰时间段是？',
      emoji: '⏰',
      type: 'multiSelect',
      maxSelect: 2,
      options: [
        { value: 'morning', label: '上午 8:00-12:00 🌄' },
        { value: 'afternoon', label: '下午 14:00-18:00 ☀️' },
        { value: 'evening', label: '晚上 19:00-22:00 🌙' },
        { value: 'lateNight', label: '深夜 22:00+ 🌃' }
      ]
    }
  ],

  // ===== 阶段 3：趣味加分项 =====（阶段 2 问卷已删除，搭子类型移至每周偏好）
  extrasQuestions: [
    {
      id: 'e1',
      question: '以下哪些标签最能描述你？（最多选5个）',
      emoji: '🏷️',
      type: 'multiSelect',
      maxSelect: 5,
      options: [
        { value: 'ddlWarrior', label: 'DDL战士 ⚔️', bigFiveHint: { C: -1 } },
        { value: 'foodie', label: '校园美食家 🍔' },
        { value: 'coffeeAddict', label: '咖啡续命人 ☕' },
        { value: 'catPerson', label: '猫奴 / 爱撸猫 🐱' },
        { value: 'memeLord', label: '表情包大户 😂' },
        { value: 'animeFan', label: '动漫/二次元爱好者 🎬' },
        { value: 'bookworm', label: '图书馆常驻民 📚' },
        { value: 'sportsFanatic', label: '体育赛事狂热粉 🏀' },
        { value: 'musicLover', label: '耳机不离身 🎧' },
        { value: 'photographyEnthusiast', label: '校园摄影爱好者 📸' },
        { value: 'boardGameFan', label: '桌游/剧本杀爱好者 🎲' },
        { value: 'earlyBird', label: '清晨打卡人 ☀️' }
      ]
    },
    {
      id: 'e2',
      question: '用一句话形容你理想中的搭子相处模式？',
      emoji: '💬',
      type: 'textInput',
      maxLength: 60,
      placeholder: '例如："一起卷但别太卷，学累了去吃火锅的那种"'
    }
  ],

  // 滑杆结果 → 标签映射
  tagThresholds: {
    primary: 80,
    secondary: 50
  },

  tagMappings: {
    nightOwl: { questionId: 's1', value: 'nightOwl', emoji: '🦉', label: '夜猫子' },
    earlyBird: { questionId: 's1', value: 'earlyBird', emoji: '🦅', label: '早起鸟' },
    ddlWarrior: { questionId: 'e1', value: 'ddlWarrior', emoji: '⚔️', label: 'DDL战士' },
    foodie: { questionId: 'e1', value: 'foodie', emoji: '🍔', label: '美食家' },
    highOpenness: { questionId: 'p4', threshold: 70, emoji: '🔍', label: '好奇探险家' },
    highConscientiousness: { questionId: 'p2', threshold: 70, emoji: '📋', label: '计划达人' },
    highExtraversion: { questionId: 'p1', threshold: 70, emoji: '🎤', label: '社交能量体' },
    highAgreeableness: { questionId: 'p5', threshold: 70, emoji: '🤝', label: '暖心队友' },
    lowNeuroticism: { questionId: 'p3', threshold: 30, emoji: '🧘', label: '情绪稳定型' }
  }
};

module.exports = QUIZ_CONFIG;