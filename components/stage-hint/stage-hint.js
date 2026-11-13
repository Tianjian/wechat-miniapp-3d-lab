// components/stage-hint/stage-hint.js —— 实验页底部操作提示条
Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    text: { type: String, value: '' },
    action: { type: String, value: '' }
  },

  methods: {
    handleAction() {
      this.triggerEvent('action')
    }
  }
})
