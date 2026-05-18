// mock/data.js — Mock 数据层（不依赖云开发）
// 所有 Mock 数据严格遵循云数据库 Schema

const MOCK_USERS = [
  {
    _id: 'u1',
    userId: '24373001',
    email: 'alice@buaa.edu.cn',
    gender: 2,
    campus: '学院路校区',
    schedule: 'nightOwl',
    scheduleLabel: '夜猫子 🦉',
    targetVibe: 'study',
    displayTags: [
      { type: 'primary', key: 'nightOwl', emoji: '🦉', label: '夜猫子' },
      { type: 'primary', key: 'ddlWarrior', emoji: '⚔️', label: 'DDL战士' },
      { type: 'secondary', key: 'coffeeAddict', emoji: '☕', label: '咖啡续命人' }
    ],
    aiSummary: '✨ 凌晨两点代码灵感爆棚的航天人，DDL面前从不认输，希望找个能一起安静刷夜的搭子。',
    avatar: '👩‍💻',
    name: 'Alice',
    isVerified: true,
    userStatus: 'normal'
  },
  {
    _id: 'u2',
    userId: '24373002',
    email: 'bob@buaa.edu.cn',
    gender: 1,
    campus: '学院路校区',
    schedule: 'nightOwl',
    scheduleLabel: '夜猫子 🦉',
    targetVibe: 'study',
    displayTags: [
      { type: 'primary', key: 'nightOwl', emoji: '🦉', label: '夜猫子' },
      { type: 'primary', key: 'bookworm', emoji: '📚', label: '图书馆常驻民' },
      { type: 'secondary', key: 'highConscientiousness', emoji: '📋', label: '计划达人' }
    ],
    aiSummary: '📋 每晚10点准时出现在图书馆三楼靠窗位置的工科男，笔记分享狂魔，寻一枚同样自律的学习搭子。',
    avatar: '👨‍🔧',
    name: 'Bob',
    isVerified: true,
    userStatus: 'normal'
  },
  {
    _id: 'u3',
    userId: '24373003',
    email: 'carol@buaa.edu.cn',
    gender: 2,
    campus: '沙河校区',
    schedule: 'earlyBird',
    scheduleLabel: '早起鸟 🦅',
    targetVibe: 'fitness',
    displayTags: [
      { type: 'primary', key: 'earlyBird', emoji: '🦅', label: '早起鸟' },
      { type: 'primary', key: 'sportsFanatic', emoji: '🏀', label: '运动狂热粉' },
      { type: 'secondary', key: 'highExtraversion', emoji: '🎤', label: '社交能量体' }
    ],
    aiSummary: '🏀 早上6点雷打不动操场5公里的元气少女，周末爱组各种球局，寻一枚能互相督促的运动搭子。',
    avatar: '🏃‍♀️',
    name: 'Carol',
    isVerified: true,
    userStatus: 'normal'
  },
  {
    _id: 'u4',
    userId: '24373004',
    email: 'dave@buaa.edu.cn',
    gender: 1,
    campus: '沙河校区',
    schedule: 'earlyBird',
    scheduleLabel: '早起鸟 🦅',
    targetVibe: 'fitness',
    displayTags: [
      { type: 'primary', key: 'earlyBird', emoji: '🦅', label: '早起鸟' },
      { type: 'primary', key: 'highExtraversion', emoji: '🎤', label: '社交能量体' },
      { type: 'secondary', key: 'foodie', emoji: '🍔', label: '校园美食家' }
    ],
    aiSummary: '💪 健身房里泡了两年半的撸铁男孩，练后餐狂热研究者，希望找个能一起监督饮食+训练的搭子。',
    avatar: '🏋️',
    name: 'Dave',
    isVerified: true,
    userStatus: 'normal'
  },
  {
    _id: 'u5',
    userId: '24373005',
    email: 'eve@buaa.edu.cn',
    gender: 2,
    campus: '学院路校区',
    schedule: 'dayWalker',
    scheduleLabel: '日行者 ☀️',
    targetVibe: 'game',
    displayTags: [
      { type: 'primary', key: 'nightOwl', emoji: '🦉', label: '夜猫子' },
      { type: 'primary', key: 'animeFan', emoji: '🎬', label: '二次元' },
      { type: 'secondary', key: 'memeLord', emoji: '😂', label: '表情包大户' }
    ],
    aiSummary: '🎮 白天上课晚上打瓦的电竞少女，开麦不压力且会主动报点，找一枚心态好的上分搭子。',
    avatar: '🎧',
    name: 'Eve',
    isVerified: true,
    userStatus: 'normal'
  }
];

// 模拟匹配池数据
const MOCK_MATCH_POOL = {
  _id: 'mp1',
  weekLabel: '2026W21',
  userId: 'current',
  vibeType: 'study',
  revealed: true,
  completedSelection: false,
  candidates: [
    {
      candidateId: 'u1',
      score: 92,
      highlightTags: [
        { emoji: '🦉', label: '夜猫子' },
        { emoji: '⚔️', label: 'DDL战士' },
        { emoji: '☕', label: '咖啡续命人' }
      ],
      sharedTags: '夜猫子、DDL战士、咖啡续命人',
      scheduleSync: true,
      campusLink: true,
      voted: null,
      name: 'Alice',
      avatar: '👩‍💻',
      campus: '学院路校区',
      scheduleLabel: '夜猫子 🦉',
      aiSummary: '✨ 凌晨两点代码灵感爆棚的航天人，DDL面前从不认输，希望找个能一起安静刷夜的搭子。'
    },
    {
      candidateId: 'u2',
      score: 88,
      highlightTags: [
        { emoji: '🦉', label: '夜猫子' },
        { emoji: '📚', label: '图书馆常驻民' },
        { emoji: '📋', label: '计划达人' }
      ],
      sharedTags: '夜猫子、图书馆常驻民',
      scheduleSync: true,
      campusLink: true,
      voted: null,
      name: 'Bob',
      avatar: '👨‍🔧',
      campus: '学院路校区',
      scheduleLabel: '夜猫子 🦉',
      aiSummary: '📋 每晚10点准时出现在图书馆三楼靠窗位置的工科男，笔记分享狂魔，寻一枚同样自律的学习搭子。'
    },
    {
      candidateId: 'u5',
      score: 76,
      highlightTags: [
        { emoji: '🦉', label: '夜猫子' },
        { emoji: '📍', label: '同校区' }
      ],
      sharedTags: '夜猫子、同校区',
      scheduleSync: true,
      campusLink: true,
      voted: null,
      name: 'Eve',
      avatar: '🎧',
      campus: '学院路校区',
      scheduleLabel: '日行者 ☀️',
      aiSummary: '🎮 白天上课晚上打瓦的电竞少女，开麦不压力且会主动报点，找一枚心态好的上分搭子。'
    }
  ]
};

// 模拟本周偏好数据（按用户 ID 索引）
const MOCK_WEEKLY_PREFS = {
  current: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'study', label: '学习/考研', emoji: '📚' }],
    subCategories: {
      study: [
        { value: 'coding', label: '编程/Coding', emoji: '💻' },
        { value: 'dailyStudy', label: '日常自习', emoji: '📖' }
      ]
    },
    additionalPrefs: { expectation: 60, frequency: 'weekly2-3' }
  },
  u1: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'study', label: '学习/考研', emoji: '📚' }],
    subCategories: {
      study: [
        { value: 'postgrad', label: '考研备战', emoji: '🎓' },
        { value: 'coding', label: '编程/Coding', emoji: '💻' }
      ]
    },
    additionalPrefs: { expectation: 50, frequency: 'daily' }
  },
  u2: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'study', label: '学习/考研', emoji: '📚' }],
    subCategories: {
      study: [
        { value: 'dailyStudy', label: '日常自习', emoji: '📖' },
        { value: 'finalExam', label: '期末复习', emoji: '📝' }
      ]
    },
    additionalPrefs: { expectation: 70, frequency: 'weekly2-3' }
  },
  u3: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'fitness', label: '健身运动', emoji: '💪' }],
    subCategories: {
      fitness: [
        { value: 'running', label: '跑步/散步', emoji: '🏃' },
        { value: 'badminton', label: '羽毛球', emoji: '🏸' }
      ]
    },
    additionalPrefs: { expectation: 40, frequency: 'daily' }
  },
  u4: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'fitness', label: '健身运动', emoji: '💪' }],
    subCategories: {
      fitness: [
        { value: 'gym', label: '健身/撸铁', emoji: '💪' },
        { value: 'swimming', label: '游泳', emoji: '🏊' }
      ]
    },
    additionalPrefs: { expectation: 30, frequency: 'weekly2-3' }
  },
  u5: {
    weekLabel: '2026W21',
    vibeTypes: [{ value: 'game', label: '游戏上分', emoji: '🎮' }],
    subCategories: {
      game: [
        { value: 'wangzhe', label: '王者荣耀', emoji: '👑' },
        { value: 'boardgame', label: '桌游/剧本杀', emoji: '🎲' }
      ]
    },
    additionalPrefs: { expectation: 80, frequency: 'casual' }
  }
};

// ===== 导出函数 =====

function getCurrentUserMatchPool() {
  return MOCK_MATCH_POOL;
}

function getMockMatch() {
  return {
    name: 'Alice',
    avatar: '👩‍💻',
    campus: '学院路校区',
    scheduleLabel: '夜猫子 🦉',
    aiSummary: '✨ 凌晨两点代码灵感爆棚的航天人，DDL面前从不认输，希望找个能一起安静刷夜的搭子。',
    highlightTags: [
      { emoji: '🦉', label: '夜猫子' },
      { emoji: '⚔️', label: 'DDL战士' },
      { emoji: '☕', label: '咖啡续命人' }
    ],
    sharedTags: ['nightOwl', 'ddlWarrior', 'coffeeAddict'],
    contact: 'WeChat: alice_buaa_2024'
  };
}

function getUsersByVibe(vibeType, excludeIds) {
  return MOCK_USERS.filter(u =>
    u.targetVibe === vibeType && !excludeIds.includes(u._id)
  );
}

function getUserById(userId) {
  return MOCK_USERS.find(u => u._id === userId) || null;
}

function simulateOtherVote(score) {
  if (score >= 85) return 'HEART';
  if (score >= 70) return 'MEET';
  return 'PASS';
}

module.exports = {
  MOCK_USERS,
  MOCK_MATCH_POOL,
  MOCK_WEEKLY_PREFS,
  getCurrentUserMatchPool,
  getMockMatch,
  getUsersByVibe,
  getUserById,
  simulateOtherVote
};