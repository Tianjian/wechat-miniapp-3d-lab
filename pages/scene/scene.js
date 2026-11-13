// pages/scene/scene.js —— 视差星域：单指平移、双指缩放、陀螺仪驱动
const content = require('../../utils/content')
const { clamp, distanceBetween, percentLabel, round } = require('../../utils/3d')

const PAN_LIMIT_X = 170
const PAN_LIMIT_Y = 150
const ZOOM_MIN = 0.7
const ZOOM_MAX = 1.8

Page({
  data: {
    stars: content.createStars(64),
    panels: content.SCENE_PANELS,
    zoom: 1,
    zoomLabel: '100%',
    panX: 0,
    panY: 0,
    rotX: 0,
    rotY: 0,
    gyroOn: false,
    modeLabel: '手势',
    dragging: false,
    worldStyle: '',
    farStyle: '',
    midStyle: '',
    nearStyle: ''
  },

  onLoad() {
    this.applyView(0, 0, 1)
  },

  handleTouchStart(event) {
    const touches = event.touches || []
    this.setData({ dragging: true })
    if (touches.length >= 2) {
      this._pinch = {
        distance: distanceBetween(touches[0], touches[1]),
        zoom: this.data.zoom
      }
      this._drag = null
      return
    }
    this._pinch = null
    if (!touches.length) return
    this._drag = {
      x: touches[0].clientX,
      y: touches[0].clientY,
      panX: this.data.panX,
      panY: this.data.panY
    }
  },

  handleTouchMove(event) {
    const touches = event.touches || []
    if (touches.length >= 2) {
      if (!this._pinch) {
        this._pinch = {
          distance: distanceBetween(touches[0], touches[1]),
          zoom: this.data.zoom
        }
        return
      }
      const distance = distanceBetween(touches[0], touches[1])
      if (!distance || !this._pinch.distance) return
      this.applyView(
        this.data.panX,
        this.data.panY,
        clamp(this._pinch.zoom * (distance / this._pinch.distance), ZOOM_MIN, ZOOM_MAX)
      )
      return
    }
    if (!this._drag) return
    const dx = touches[0].clientX - this._drag.x
    const dy = touches[0].clientY - this._drag.y
    this.applyView(
      clamp(this._drag.panX + dx * 1.5, -PAN_LIMIT_X, PAN_LIMIT_X),
      clamp(this._drag.panY + dy * 1.5, -PAN_LIMIT_Y, PAN_LIMIT_Y),
      this.data.zoom
    )
  },

  handleTouchEnd(event) {
    const touches = event.touches || []
    if (!touches.length) {
      this._pinch = null
      this._drag = null
      this.setData({ dragging: false })
      return
    }
    if (touches.length === 1) {
      this._pinch = null
      this._drag = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        panX: this.data.panX,
        panY: this.data.panY
      }
    }
  },

  applyView(panX, panY, zoom) {
    const x = round(clamp(panX, -PAN_LIMIT_X, PAN_LIMIT_X), 1)
    const y = round(clamp(panY, -PAN_LIMIT_Y, PAN_LIMIT_Y), 1)
    const z = round(clamp(zoom, ZOOM_MIN, ZOOM_MAX), 2)
    const rx = clamp(round(-y * 0.06, 1), -9, 9)
    const ry = clamp(round(x * 0.06, 1), -11, 11)

    this.setData({
      panX: Math.round(x),
      panY: Math.round(y),
      zoom: z,
      zoomLabel: percentLabel(z),
      rotX: rx,
      rotY: ry,
      worldStyle: 'transform: rotateX(' + rx + 'deg) rotateY(' + ry + 'deg);',
      farStyle:
        'transform: translate3d(' +
        round(x * 0.22, 1) +
        'rpx, ' +
        round(y * 0.22, 1) +
        'rpx, -240rpx);',
      midStyle:
        'transform: translate3d(' +
        round(x * 0.5, 1) +
        'rpx, ' +
        round(y * 0.5, 1) +
        'rpx, 0);',
      nearStyle:
        'transform: translate3d(' +
        round(x * 0.9, 1) +
        'rpx, ' +
        round(y * 0.9, 1) +
        'rpx, 140rpx);'
    })
  },

  handleGyroToggle() {
    if (this.data.gyroOn) {
      this.stopGyro(false)
      return
    }
    if (
      typeof wx.startDeviceMotionListening !== 'function' ||
      typeof wx.onDeviceMotionChange !== 'function'
    ) {
      wx.showToast({ title: '当前环境不支持陀螺仪', icon: 'none' })
      return
    }

    const self = this
    wx.startDeviceMotionListening({
      interval: 'game',
      success() {
        self._gyroHandler = function (motion) {
          self.handleGyro(motion)
        }
        wx.onDeviceMotionChange(self._gyroHandler)
        self.setData({ gyroOn: true, modeLabel: '陀螺仪' })
      },
      fail() {
        wx.showToast({ title: '陀螺仪不可用', icon: 'none' })
        self.setData({ gyroOn: false, modeLabel: '手势' })
      }
    })
  },

  handleGyro(motion) {
    if (!motion) return
    const now = Date.now()
    if (this._gyroAt && now - this._gyroAt < 32) return
    this._gyroAt = now
    const gamma = clamp(motion.gamma || 0, -50, 50)
    const beta = clamp(motion.beta || 0, -60, 60)
    this.applyView(gamma * 2.6, (beta - 20) * 2, this.data.zoom)
  },

  stopGyro(silent) {
    if (typeof wx.stopDeviceMotionListening === 'function') {
      wx.stopDeviceMotionListening()
    }
    if (this._gyroHandler && typeof wx.offDeviceMotionChange === 'function') {
      wx.offDeviceMotionChange(this._gyroHandler)
    }
    this._gyroHandler = null
    this._gyroAt = 0
    if (!silent) this.setData({ gyroOn: false, modeLabel: '手势' })
  },

  handleReset() {
    if (this.data.gyroOn) this.stopGyro(false)
    this._drag = null
    this._pinch = null
    this.applyView(0, 0, 1)
    this.setData({ dragging: false })
  },

  onUnload() {
    this.stopGyro(true)
  }
})
