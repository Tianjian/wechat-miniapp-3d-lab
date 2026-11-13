// components/demo-card/demo-card.js —— 首页 3D 倾斜入口卡
const { clamp, round } = require('../../utils/3d')
const haptics = require('../../utils/haptics')

Component({
  options: {
    // 允许 app.wxss 中的 .chip / .mono 等公共类作用到组件内部
    styleIsolation: 'apply-shared'
  },

  properties: {
    code: { type: String, value: '' },
    order: { type: String, value: '01' },
    title: { type: String, value: '' },
    desc: { type: String, value: '' },
    tag: { type: String, value: '' },
    accent: { type: String, value: '#5eead4' }
  },

  data: {
    rx: 0,
    ry: 0,
    dragging: false
  },

  methods: {
    handleTouchStart(event) {
      const touch = event.touches[0]
      this._start = { x: touch.clientX, y: touch.clientY }
      this._moved = false
      this.setData({ dragging: true })
    },

    handleTouchMove(event) {
      if (!this._start) return
      const touch = event.touches[0]
      const dx = touch.clientX - this._start.x
      const dy = touch.clientY - this._start.y
      if (Math.abs(dx) + Math.abs(dy) > 6) this._moved = true
      this.setData({
        rx: clamp(round(-dy * 0.09, 1), -8, 8),
        ry: clamp(round(dx * 0.12, 1), -10, 10)
      })
    },

    handleTouchEnd() {
      if (!this._start) return
      this._start = null
      this.setData({ dragging: false, rx: 0, ry: 0 })
    },

    handleTap() {
      // 拖动结束时浏览器通常不会派发 tap，这里再做一层保护
      if (this._moved) {
        this._moved = false
        return
      }
      haptics.tap()
      this.triggerEvent('open', { key: this.data.code })
    }
  }
})
