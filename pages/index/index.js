// pages/index/index.js —— 3D LAB 首页：可拖拽主视觉 + 四个实验入口
const content = require('../../utils/content')
const { clamp, round } = require('../../utils/3d')

const HERO_X = -10
const HERO_Y = 14

Page({
  data: {
    demos: content.DEMOS,
    stats: content.HOME_STATS,
    heroX: HERO_X,
    heroY: HERO_Y,
    heroDragging: false
  },

  onLoad() {},

  handleOpenDemo(event) {
    const key = event.detail && event.detail.key
    const demo = content.DEMOS.find(function (item) {
      return item.key === key
    })
    if (!demo) return
    wx.navigateTo({ url: demo.path })
  },

  handleHeroStart(event) {
    const touch = event.touches[0]
    this._hero = { x: touch.clientX, y: touch.clientY }
    this.setData({ heroDragging: true })
  },

  handleHeroMove(event) {
    if (!this._hero) return
    const touch = event.touches[0]
    const dx = touch.clientX - this._hero.x
    const dy = touch.clientY - this._hero.y
    this._hero.x = touch.clientX
    this._hero.y = touch.clientY
    this.setData({
      heroX: clamp(round(this.data.heroX - dy * 0.22, 1), -26, 26),
      heroY: clamp(round(this.data.heroY + dx * 0.28, 1), -40, 40)
    })
  },

  handleHeroEnd() {
    if (!this._hero) return
    this._hero = null
    this.setData({ heroDragging: false, heroX: HERO_X, heroY: HERO_Y })
  },

  onShareAppMessage() {
    return {
      title: '3D LAB · 把界面推进第三维',
      path: '/pages/index/index'
    }
  }
})
