// pages/cube/cube.js —— 可拖拽旋转的立方体：手势角度 + 惯性滑行 + 自动旋转
const content = require('../../utils/content')
const { clamp, momentum, round, velocityOf } = require('../../utils/3d')
const haptics = require('../../utils/haptics')

const BASE_X = -18
const BASE_Y = 28
const MIN_X = -72
const MAX_X = 72
const MIN_Y = -720
const MAX_Y = 720

Page({
  data: {
    faces: content.CUBE_FACES,
    faceInfo: content.CUBE_FACES[0],
    activeFace: 'front',
    rotX: BASE_X,
    rotY: BASE_Y,
    dragging: false,
    autoSpin: true
  },

  onLoad() {
    this.setData({ faceInfo: content.CUBE_FACES[0] })
  },

  handleTouchStart(event) {
    const touch = event.touches[0]
    this._drag = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
      vx: 0,
      vy: 0
    }
    this._moved = false
    this.setData({ dragging: true })
  },

  handleTouchMove(event) {
    if (!this._drag) return
    const touch = event.touches[0]
    const now = Date.now()
    const elapsed = Math.max(16, now - this._drag.at)
    const dx = touch.clientX - this._drag.x
    const dy = touch.clientY - this._drag.y

    if (Math.abs(dx) + Math.abs(dy) > 3) this._moved = true
    this._drag.vx = velocityOf(dx, elapsed)
    this._drag.vy = velocityOf(dy, elapsed)
    this._drag.x = touch.clientX
    this._drag.y = touch.clientY
    this._drag.at = now

    this.setData({
      rotX: clamp(round(this.data.rotX - dy * 0.34, 1), MIN_X, MAX_X),
      rotY: clamp(round(this.data.rotY + dx * 0.42, 1), MIN_Y, MAX_Y)
    })
  },

  handleTouchEnd() {
    if (!this._drag) return
    const vx = this._drag.vx
    const vy = this._drag.vy
    this._drag = null
    this.setData({
      dragging: false,
      rotX: momentum(this.data.rotX, -vy, 180, MIN_X, MAX_X),
      rotY: momentum(this.data.rotY, vx, 180, MIN_Y, MAX_Y)
    })
  },

  handleFaceTap(event) {
    if (this._moved) {
      this._moved = false
      return
    }
    const key = event.currentTarget.dataset.face
    const face = content.CUBE_FACES.find(function (item) {
      return item.key === key
    })
    if (!face) return
    haptics.tap()
    this.setData({ activeFace: face.key, faceInfo: face, autoSpin: false })
  },

  handleAutoSpin() {
    const autoSpin = !this.data.autoSpin
    haptics.tap()
    this.setData({ autoSpin })
  },

  handleReset() {
    this._drag = null
    haptics.tap()
    this.setData({
      rotX: BASE_X,
      rotY: BASE_Y,
      dragging: false,
      autoSpin: false,
      activeFace: 'front',
      faceInfo: content.CUBE_FACES[0]
    })
  }
})
