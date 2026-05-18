// components/match/ice-breaker/index.js
// 匹配成功后动态破冰锦囊组件
const { generateIceBreaker } = require('../../../config/vibeThemes');

Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  properties: {
    vibeType: { type: String, value: 'study' },
    sharedTags: { type: Array, value: [] },
    partnerName: { type: String, value: '' }
  },
  data: {
    breakers: [],
    mainBreaker: ''
  },
  lifetimes: {
    attached: function () {
      this.generateBreakers();
    }
  },
  observers: {
    'vibeType, sharedTags': function () {
      this.generateBreakers();
    }
  },
  methods: {
    generateBreakers: function () {
      const main = generateIceBreaker(this.data.vibeType, this.data.sharedTags);
      const { VIBE_THEMES } = require('../../../config/vibeThemes');
      const universal = VIBE_THEMES.universalIceBreakers || [];

      const breakers = [main];
      if (universal.length > 0) {
        breakers.push(universal[Math.floor(Math.random() * universal.length)]);
      }

      this.setData({
        mainBreaker: main,
        breakers
      });

      console.log('[ice-breaker] generated', breakers.length, 'breakers for', this.data.vibeType);
    },

    onRefresh: function () {
      this.generateBreakers();
      wx.showToast({ title: '已刷新破冰建议', icon: 'success' });
    }
  }
});