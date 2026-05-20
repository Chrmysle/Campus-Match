// components/nav-bar/nav-bar.js — 衬线字体品牌导航栏
Component({
  properties: {
    title: { type: String, value: 'CampusLink' },
    showBack: { type: Boolean, value: false },
    backUrl: { type: String, value: '' }
  },

  data: {
    statusBarHeight: 44
  },

  lifetimes: {
    attached() {
      try {
        const win = wx.getWindowInfo();
        this.setData({ statusBarHeight: win.statusBarHeight || 44 });
      } catch (e) {
        try {
          const sys = wx.getSystemInfoSync();
          this.setData({ statusBarHeight: sys.statusBarHeight || 44 });
        } catch (e2) {}
      }
    }
  },

  methods: {
    onBack() {
      if (this.data.backUrl) {
        wx.navigateBack();
      } else {
        wx.navigateBack();
      }
    }
  }
});