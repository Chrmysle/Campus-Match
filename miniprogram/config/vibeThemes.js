// config/vibeThemes.js — 搭子类型配色矩阵 & 动态破冰文案模板

const VIBE_THEMES = {
  study: {
    name: '学习/考研',
    emoji: '📚',
    color: '#C4D0E8',
    colorDark: '#8BA4D0',
    gradient: 'linear-gradient(135deg, #E8EEF6 0%, #C4D0E8 100%)',
    cardBadge: '学术搭子',
    candidateCount: 3,
    iceBreakers: [
      {
        matchTags: ['nightOwl', 'ddlWarrior'],
        template: '检测到你们都是深夜DDL战士 🌙⚔️ 不如约个22:00后的图书馆互相监督？效率翻倍预警！'
      },
      {
        matchTags: ['highConscientiousness', 'earlyBird'],
        template: '两个计划达人 + 早起鸟 🦅📋 明早7:30食堂豆浆局，吃完直接冲图书馆，走起？'
      },
      {
        matchTags: ['bookworm'],
        template: '图书馆常驻民 ×2 📚 发现你们常去同一层！下次可以帮忙占座+交流笔记~'
      },
      {
        matchTags: ['coffeeAddict'],
        template: '咖啡续命同盟 ☕🤝 校区旁边新开的精品咖啡馆，要不要一起去刷题？'
      },
      {
        matchTags: ['highOpenness'],
        template: '你们都是好奇心爆棚的探险家 🔍 试试一起用新方法攻克那门头疼的课？'
      }
    ],
    defaultIceBreaker: '缘分让你们成为学习搭子 📚 从今天起，互相监督、共同进步，一起卷出好成绩！'
  },

  game: {
    name: '游戏上分',
    emoji: '🎮',
    color: '#E8C4C4',
    colorDark: '#D49898',
    gradient: 'linear-gradient(135deg, #F6E8E8 0%, #E8C4C4 100%)',
    cardBadge: '游戏搭子',
    candidateCount: 5,
    iceBreakers: [
      {
        matchTags: ['nightOwl'],
        template: '夜猫子双排时间到 🦉🎮 你们的高峰在线时间完美重合！今晚就开一局？'
      },
      {
        matchTags: ['memeLord'],
        template: '表情包双雄 😂🎮 一边打游戏一边用表情包轰炸对方，这画面太美~'
      },
      {
        matchTags: ['animeFan'],
        template: '二次元 + 玩家双重身份 🎬🎮 最近那个游戏改编的番追了吗？边打边聊！'
      }
    ],
    defaultIceBreaker: '游戏搭子已就位 🎮 开黑不压力、沟通不暴躁，一起快乐上分！'
  },

  fitness: {
    name: '健身运动',
    emoji: '💪',
    color: '#C4D4C4',
    colorDark: '#8CB88C',
    gradient: 'linear-gradient(135deg, #E8F0E8 0%, #C4D4C4 100%)',
    cardBadge: '运动搭子',
    candidateCount: 5,
    iceBreakers: [
      {
        matchTags: ['earlyBird'],
        template: '两个清晨打卡人 ☀️💪 明早6:30操场见？晨跑完一起去食堂吃第一锅豆浆油条！'
      },
      {
        matchTags: ['sportsFanatic'],
        template: '体育狂热粉 ×2 🏀 最近校队比赛一起去看？边看边聊战术那种！'
      },
      {
        matchTags: ['highExtraversion'],
        template: '两个社交能量体 🎤💪 组队参加校园趣味运动会？绝对是全场最嗨组合！'
      }
    ],
    defaultIceBreaker: '运动搭子配对成功 💪 一起流汗、互相监督，让运动不再孤单！'
  },

  entertainment: {
    name: '逛街吃饭娱乐',
    emoji: '🍜',
    color: '#E8D4C4',
    colorDark: '#D4A878',
    gradient: 'linear-gradient(135deg, #F6ECE0 0%, #E8D4C4 100%)',
    cardBadge: '娱乐搭子',
    candidateCount: 5,
    iceBreakers: [
      {
        matchTags: ['foodie'],
        template: '校园美食家同盟 🍔🤝 你们收藏夹里躺着的那些店，是时候一家一家拔草了！'
      },
      {
        matchTags: ['photographyEnthusiast'],
        template: '摄影达人 + 探店搭子 📸🍜 一起出片、一起修图，朋友圈素材管够！'
      },
      {
        matchTags: ['boardGameFan'],
        template: '桌游剧本杀双人组 🎲 周末约个剧本杀局？你们的口味意外地很合拍！'
      }
    ],
    defaultIceBreaker: '娱乐搭子已连接 🍜 从今天起，不再一个人吃饭逛街，快乐加倍！'
  }
};

// 通用破冰文案池（无特定标签交集时随机抽取）
VIBE_THEMES.universalIceBreakers = [
  '缘分算法把你们撮合到一起 ✨ 勇敢迈出第一步，校园生活从此不一样！',
  '检测到高匹配值 🔥 你们的兴趣图谱高度重合，先聊起来看看火花？',
  '算法说你们很搭，剩下的交给勇气 💫 发个表情包破冰吧！'
];

// 根据标签交集生成破冰文案
function generateIceBreaker(vibeType, sharedTags) {
  const theme = VIBE_THEMES[vibeType];
  if (!theme) return VIBE_THEMES.universalIceBreakers[0];

  const sharedSet = new Set(sharedTags || []);

  // 按优先级匹配
  for (const breaker of (theme.iceBreakers || [])) {
    if (breaker.matchTags.every(t => sharedSet.has(t))) {
      return breaker.template;
    }
  }

  // 部分匹配
  for (const breaker of (theme.iceBreakers || [])) {
    if (breaker.matchTags.some(t => sharedSet.has(t))) {
      return breaker.template;
    }
  }

  return theme.defaultIceBreaker;
}

module.exports = { VIBE_THEMES, generateIceBreaker };