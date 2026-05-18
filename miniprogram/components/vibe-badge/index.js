Component({
  properties: {
    text: String,
    emoji: String,
    color: String,
    size: { type: String, value: 'md' },
    active: { type: Boolean, value: false }
  },
  methods: {
    onTap: function () {
      this.triggerEvent('tap', { text: this.data.text });
    }
  }
});