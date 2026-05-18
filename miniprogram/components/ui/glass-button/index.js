Component({
  properties: {
    text: String,
    type: {
      type: String,
      value: 'default'
    },
    size: {
      type: String,
      value: 'md'
    },
    disabled: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    },
    icon: String,
    width: String
  },
  methods: {
    onTap: function () {
      if (this.data.disabled || this.data.loading) return;
      this.triggerEvent('tap');
    }
  }
});