// pages/coverflow/coverflow.js —— 3D Coverflow：环形偏移 + 滑动 / 点按 / 按钮共用状态
const content = require('../../utils/content')
const { clamp, round, circularOffset, wrapIndex } = require('../../utils/3d')
const haptics = require('../../utils/haptics')

Page({
  data: {
    slides: content.SLIDES,
    cards: [],
    active: 0,
    info: content.SLIDES[0],
    progress: 20,
    tiltX: 0,
    tiltY: 0,
    dragging: false
  },

  onLoad() {
    this.rebuild(0)
  },

  rebuild(active) {
    const slides = content.SLIDES
    const total = slides.length
    const cards = slides.map(function (slide, index) {
      const offset = circularOffset(index, active, total)
      const distance = Math.abs(offset)
      const style =
        '--accent: ' +
        slide.accent +
        '; transform: translateX(' +
        offset * 232 +
        'rpx) translateZ(' +
        distance * -248 +
        'rpx) rotateY(' +
        offset * -33 +
        'deg) scale(' +
        Math.max(0.68, 1 - distance * 0.13) +
        '); opacity: ' +
        Math.max(0.3, 1 - distance * 0.33) +
        '; z-index: ' +
        (10 - distance) +
        ';'
      return {
        key: slide.key,
        index: slide.index,
        glyph: slide.glyph,
        title: slide.title,
        subtitle: slide.subtitle,
        tags: slide.tags,
        accent: slide.accent,
        offset,
        style
      }
    })
    this.setData({
      active,
      cards,
      info: slides[active],
      progress: Math.round(((active + 1) / total) * 100)
    })
  },

  handleTouchStart(event) {
    const touch = event.touches[0]
    this._start = { x: touch.clientX, y: touch.clientY }
    this._lastX = touch.clientX
    this._moved = false
    this._lastMoveAt = 0
    this.setData({ dragging: true })
  },

  handleTouchMove(event) {
    if (!this._start) return
    const touch = event.touches[0]
    const dx = touch.clientX - this._start.x
    const dy = touch.clientY - this._start.y
    if (Math.abs(dx) + Math.abs(dy) > 8) {
      this._moved = true
      this._lastMoveAt = Date.now()
    }
    this._lastX = touch.clientX
    this.setData({
      tiltY: clamp(round(dx * 0.03, 1), -8, 8),
      tiltX: clamp(round(-dy * 0.02, 1), -6, 6)
    })
  },

  handleTouchEnd() {
    if (!this._start) return
    const dx = this._lastX - this._start.x
    this._start = null
    this.setData({ dragging: false, tiltX: 0, tiltY: 0 })
    if (this._moved && Math.abs(dx) > 42) this.step(dx < 0 ? 1 : -1)
  },

  handleCardTap(event) {
    // 刚滑动完的 300ms 内忽略 tap，避免松手瞬间误选侧边卡片
    if (this._moved && Date.now() - (this._lastMoveAt || 0) < 300) {
      this._moved = false
      return
    }
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isNaN(index) || index === this.data.active) return
    this.select(index)
  },

  handleDot(event) {
    this.select(Number(event.currentTarget.dataset.index))
  },

  handlePrev() {
    this.step(-1)
  },

  handleNext() {
    this.step(1)
  },

  handleReset() {
    haptics.tap()
    this.rebuild(0)
  },

  step(delta) {
    const total = content.SLIDES.length
    this.select(wrapIndex(this.data.active + delta, total))
  },

  select(index) {
    const total = content.SLIDES.length
    if (Number.isNaN(index)) return
    const next = wrapIndex(index, total)
    if (next === this.data.active) return
    haptics.tap()
    this.rebuild(next)
  }
})
