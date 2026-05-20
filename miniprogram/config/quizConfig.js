// config/quizConfig.js — 问卷字典（完全配置驱动）
// 大五人格：每维度 3 题，覆盖 15 个层面（Facets），混合滑杆 + 情景选择

const QUIZ_CONFIG = {
  version: '2.0.0',

  // 阶段定义
  stages: [
    { key: 'personality', title: '性格画像', subtitle: '15 道题全面了解你的个性', icon: '🎨' },
    { key: 'schedule', title: '作息节奏', subtitle: '时间对了，搭子才对', icon: '⏰' },
    { key: 'extras', title: '趣味加分', subtitle: '让算法更懂你', icon: '✨' }
  ],

  // ===== 阶段 1：人格特质（3 题/维度 × 5 维度 = 15 题，覆盖 15 个层面） =====
  // bigFiveMap: 映射到五大域（用于 domain 级聚合）
  // facet: 映射到具体层面（用于 15D 精细匹配）
  //
  // N = 神经质（情绪稳定性）, E = 外向性, O = 开放性,
  // A = 宜人性, C = 尽责性
  personalityQuestions: [
    // ——— N 神经质：焦虑倾向 ———
    {
      id: 'n1',
      question: '重要考试/面试前一晚，你通常会？',
      emoji: '😰',
      type: 'select',
      options: [
        { value: 0, label: '睡得很香，完全没在担心' },
        { value: 0.33, label: '有点小紧张但能正常睡' },
        { value: 0.66, label: '翻来覆去会想很多' },
        { value: 1.0, label: '基本失眠，脑子根本停不下来' }
      ],
      bigFiveMap: { N: 1.0 },
      facet: 'N_Anxiety'
    },
    // ——— N 神经质：情绪弹性（反向） ———
    {
      id: 'n2',
      question: '遇到打击（挂科/被批评/失恋），你通常需要多久恢复？',
      emoji: '🧘',
      type: 'select',
      options: [
        { value: 0, label: '睡一觉就好了，不算事' },
        { value: 0.33, label: '郁闷一两天就能调整过来' },
        { value: 0.66, label: '会消沉一阵子，需要朋友开导' },
        { value: 1.0, label: '很久都走不出来，反复内耗' }
      ],
      bigFiveMap: { N: 1.0 },
      facet: 'N_Vulnerability'
    },
    // ——— N 神经质：冲动控制 ———
    {
      id: 'n3',
      question: '你正在减肥/省钱/复习，朋友突然喊你出去嗨，你会？',
      emoji: '🎯',
      type: 'select',
      options: [
        { value: 0, label: '坚定拒绝，计划必须执行' },
        { value: 0.33, label: '纠结一下但还是婉拒' },
        { value: 0.66, label: '去了但全程有点罪恶感' },
        { value: 1.0, label: '毫不犹豫冲，下次再说' }
      ],
      bigFiveMap: { N: 1.0 },
      facet: 'N_Impulsiveness'
    },

    // ——— E 外向性：合群性 ———
    {
      id: 'e1',
      question: '周末没安排的时候，你更倾向于？',
      emoji: '🎉',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['一个人待着最舒服', '必须组局喊一群人'],
      bigFiveMap: { E: 1.0 },
      facet: 'E_Gregariousness'
    },
    // ——— E 外向性：果断性 ———
    {
      id: 'e2',
      question: '小组讨论中你有不同意见，你会？',
      emoji: '🎤',
      type: 'select',
      options: [
        { value: 1.0, label: '直接说出来，主动争取' },
        { value: 0.66, label: '委婉地暗示一下' },
        { value: 0.33, label: '心里有想法但没说出口' },
        { value: 0, label: '无所谓，大家决定就好' }
      ],
      bigFiveMap: { E: 1.0 },
      facet: 'E_Assertiveness'
    },
    // ——— E 外向性：热情/亲和 ———
    {
      id: 'e3',
      question: '认识新朋友时，你通常会？',
      emoji: '🤝',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['保持距离慢慢观察', '很快就能热络起来'],
      bigFiveMap: { E: 1.0 },
      facet: 'E_Warmth'
    },

    // ——— O 开放性：求新知 ———
    {
      id: 'o1',
      question: '你对新事物、新观点的态度是？',
      emoji: '🔍',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['偏爱熟悉和传统', '热爱尝鲜，拥抱变化'],
      bigFiveMap: { O: 1.0 },
      facet: 'O_Ideas'
    },
    // ——— O 开放性：行动风格 ———
    {
      id: 'o2',
      question: '假期到了，你更倾向哪种安排？',
      emoji: '✈️',
      type: 'select',
      options: [
        { value: 1.0, label: '去一个完全陌生的地方探险' },
        { value: 0.66, label: '去感兴趣的新地方但有计划' },
        { value: 0.33, label: '去熟悉的喜欢的地方' },
        { value: 0, label: '在家躺平最舒服' }
      ],
      bigFiveMap: { O: 1.0 },
      facet: 'O_Actions'
    },
    // ——— O 开放性：审美敏感性 ———
    {
      id: 'o3',
      question: '看到绝美夕阳/艺术作品/听到触动你的音乐，你会？',
      emoji: '🎨',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['没啥特别感觉', '会被深深打动，沉浸其中'],
      bigFiveMap: { O: 1.0 },
      facet: 'O_Aesthetics'
    },

    // ——— A 宜人性：信任倾向 ———
    {
      id: 'a1',
      question: '陌生人向你求助/借东西，你通常会？',
      emoji: '💛',
      type: 'select',
      options: [
        { value: 1.0, label: '直接帮忙，能帮就帮' },
        { value: 0.66, label: '先问清楚情况再决定' },
        { value: 0.33, label: '委婉拒绝' },
        { value: 0, label: '怀疑有问题，不会理' }
      ],
      bigFiveMap: { A: 1.0 },
      facet: 'A_Trust'
    },
    // ——— A 宜人性：利他性 ———
    {
      id: 'a2',
      question: '朋友半夜心情不好打电话向你倾诉，你会？',
      emoji: '🌙',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['"明天说，我要睡了"', '"你说，我陪你"'],
      bigFiveMap: { A: 1.0 },
      facet: 'A_Altruism'
    },
    // ——— A 宜人性：顺从性 ———
    {
      id: 'a3',
      question: '和别人意见不合时，你更倾向？',
      emoji: '🤗',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['坚持到底，不能让步', '算了，听他的也没事'],
      bigFiveMap: { A: 1.0 },
      facet: 'A_Compliance'
    },

    // ——— C 尽责性：条理性 ———
    {
      id: 'c1',
      question: '你的书桌/房间通常是？',
      emoji: '📋',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['乱中有序（其实就是乱）', '一尘不染，万物归位'],
      bigFiveMap: { C: 1.0 },
      facet: 'C_Order'
    },
    // ——— C 尽责性：成就驱动 ———
    {
      id: 'c2',
      question: '面对一个很难但很有价值的任务，你通常会？',
      emoji: '🏆',
      type: 'select',
      options: [
        { value: 1.0, label: '全力冲刺，不惜通宵搞定' },
        { value: 0.66, label: '制定计划稳步推进' },
        { value: 0.33, label: '能做多少做多少吧' },
        { value: 0, label: '太难了，换简单的做' }
      ],
      bigFiveMap: { C: 1.0 },
      facet: 'C_Achievement'
    },
    // ——— C 尽责性：自律性 ———
    {
      id: 'c3',
      question: '你立 flag（目标）的能力怎么样？',
      emoji: '🎯',
      type: 'slider',
      min: 0, max: 100, step: 10,
      labels: ['经常立经常倒', '立了就能坚持做到'],
      bigFiveMap: { C: 1.0 },
      facet: 'C_SelfDiscipline'
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

  // ===== 阶段 3：趣味加分项 =====
  extrasQuestions: [
    {
      id: 'x1',
      question: '以下哪些标签最能描述你？（最多选5个）',
      emoji: '🏷️',
      type: 'multiSelect',
      maxSelect: 5,
      options: [
        { value: 'ddlWarrior', label: 'DDL战士 ⚔️' },
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
      id: 'x2',
      question: '用一句话形容你理想中的搭子相处模式？',
      emoji: '💬',
      type: 'textInput',
      maxLength: 60,
      placeholder: '例如："一起卷但别太卷，学累了去吃火锅的那种"'
    },
    {
      id: 'x3',
      question: '你的微信号是？匹配成功后搭子将通过此联系方式找到你',
      emoji: '💌',
      type: 'textInput',
      maxLength: 30,
      placeholder: '填写你的微信号'
    }
  ],

  // 滑杆结果 → 标签映射
  tagThresholds: {
    primary: 80,
    secondary: 50
  },

  // 基于答题结果自动生成的标签（保留关键项用于首页展示）
  tagMappings: {
    nightOwl: { questionId: 's1', value: 'nightOwl', emoji: '🦉', label: '夜猫子' },
    earlyBird: { questionId: 's1', value: 'earlyBird', emoji: '🦅', label: '早起鸟' },
    ddlWarrior: { questionId: 'x1', value: 'ddlWarrior', emoji: '⚔️', label: 'DDL战士' },
    foodie: { questionId: 'x1', value: 'foodie', emoji: '🍔', label: '美食家' },
    // 人格 facet 标签（基于具体层面阈值）
    lowAnxiety: { questionId: 'n1', threshold: 30, emoji: '🧘', label: '情绪稳如泰山' },
    highAssertive: { questionId: 'e2', threshold: 70, emoji: '🎤', label: '有话直说' },
    highCurious: { questionId: 'o1', threshold: 70, emoji: '🔍', label: '好奇宝宝' },
    helpful: { questionId: 'a1', threshold: 70, emoji: '💛', label: '热心肠' },
    achievement: { questionId: 'c2', threshold: 70, emoji: '🏆', label: '卷王本王' },
    orderly: { questionId: 'c1', threshold: 70, emoji: '📋', label: '收纳达人' }
  }
};

/**
 * 获取大五人格所有 15 个层面的 key 列表
 */
QUIZ_CONFIG.FACET_LIST = [
  'N_Anxiety', 'N_Vulnerability', 'N_Impulsiveness',
  'E_Gregariousness', 'E_Assertiveness', 'E_Warmth',
  'O_Ideas', 'O_Actions', 'O_Aesthetics',
  'A_Trust', 'A_Altruism', 'A_Compliance',
  'C_Order', 'C_Achievement', 'C_SelfDiscipline'
];

/**
 * 获取每个 facet 对应的中文标签
 */
QUIZ_CONFIG.FACET_LABELS = {
  N_Anxiety: '焦虑倾向', N_Vulnerability: '脆弱性', N_Impulsiveness: '冲动控制',
  E_Gregariousness: '合群性', E_Assertiveness: '果断性', E_Warmth: '热情',
  O_Ideas: '求知欲', O_Actions: '行动力', O_Aesthetics: '审美敏感性',
  A_Trust: '信任倾向', A_Altruism: '利他性', A_Compliance: '顺从性',
  C_Order: '条理性', C_Achievement: '成就驱动', C_SelfDiscipline: '自律性'
};

/**
 * 获取每个 facet 所属的 domain
 */
QUIZ_CONFIG.FACET_DOMAIN = {
  N_Anxiety: 'N', N_Vulnerability: 'N', N_Impulsiveness: 'N',
  E_Gregariousness: 'E', E_Assertiveness: 'E', E_Warmth: 'E',
  O_Ideas: 'O', O_Actions: 'O', O_Aesthetics: 'O',
  A_Trust: 'A', A_Altruism: 'A', A_Compliance: 'A',
  C_Order: 'C', C_Achievement: 'C', C_SelfDiscipline: 'C'
};

module.exports = QUIZ_CONFIG;