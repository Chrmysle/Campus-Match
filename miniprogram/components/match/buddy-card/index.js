// components/match/buddy-card/index.js
// 匹配大厅个人卡片 — AI 气泡名片 + 高光标签
Component({
  options: {
    styleIsolation: 'apply-shared'
  },
  properties: {
    candidate: { type: Object, value: null },
    vibeTheme: { type: Object, value: null },
    showActions: { type: Boolean, value: true },
    compact: { type: Boolean, value: false }
  },
  data: {
    animStyle: '',
    defaultAvatar: '👤',
    defaultColor: '#C4A484'
  },
  methods: {
    // 三档投票
    onVote: function (e) {
      const actionType = e.currentTarget.dataset.action;
      console.log('[buddy-card] vote:', actionType);

      this.animateOut(actionType, () => {
        this.triggerEvent('vote', { actionType, candidate: this.data.candidate });
      });
    },

    // 卡片飞出动画
    animateOut: function (actionType, callback) {
      const anim = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease-in'
      });
      const isPass = actionType === 'PASS';
      anim.translateX(isPass ? 500 : -500).rotateZ(isPass ? 20 : -20).opacity(0).step();
      this.setData({ animStyle: anim.export() }, () => {
        setTimeout(callback, 320);
      });
    },

    // 重置动画
    resetAnimation: function () {
      const anim = wx.createAnimation({ duration: 0 });
      anim.translateX(0).rotateZ(0).opacity(1).step();
      this.setData({ animStyle: anim.export() });
    },

    onCardTap: function () {
      this.triggerEvent('tap', { candidate: this.data.candidate });
    }
  }
});