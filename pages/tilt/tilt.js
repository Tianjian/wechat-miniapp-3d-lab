// pages/tilt/tilt.js —— 全息卡片：跟手倾斜、高光追踪、双面翻转
const content = require('../../utils/content')
const { clamp, round, tiltFromDelta } = require('../../utils/3d')
const haptics = require('../../utils/haptics')

Page({
  data: {
    features: content.TILT_FEATURES,
    rx: 0,
    ry: 0,
    glare: 0,
    glareX: 50,
    glareY: 42,
    flipped: false,
    dragging: false,
    side: 'FRONT'
  },

  handleTouchStart(event) {
    const touch = event.touches[0]
    this._start = { x: touch.clientX, y: touch.clientY }
    this._moved = false
    this.setData({ dragging: true })
  },

  handleTouchMove(event) {
    if (!this._start) return
    const touch = event.touches[0]
    const dx = clamp(touch.clientX - this._start.x, -240, 240)
    const dy = clamp(touch.clientY - this._start.y, -240, 240)
    if (Math.abs(dx) + Math.abs(dy) > 4) this._moved = true
    const tilt = tiltFromDelta(dx, dy, { sensitivity: 0.09, max: 18 })
    this.setData({
      rx: tilt.rx,
      ry: tilt.ry,
      glare: 0.5,
      glareX: clamp(round(50 + dx / 4, 1), 0, 100),
      glareY: clamp(round(42 + dy / 5, 1), 0, 100)
    })
  },

  handleTouchEnd() {
    if (!this._start) return
    this._start = null
    this.setData({ dragging: false, rx: 0, ry: 0, glare: 0 })
  },

  handleFlip() {
    if (this._moved) {
      this._moved = false
      return
    }
    const flipped = !this.data.flipped
    haptics.tap()
    this.setData({
      flipped,
      side: flipped ? 'BACK' : 'FRONT',
      rx: 0,
      ry: 0,
      glare: 0
    })
  },

  handleReset() {
    this._start = null
    haptics.tap()
    this.setData({
      flipped: false,
      side: 'FRONT',
      rx: 0,
      ry: 0,
      glare: 0,
      dragging: false
    })
  }
})
