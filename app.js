// app.js —— 3D LAB 入口：记录运行环境，供各实验页读取视口尺寸
App({
  globalData: {
    version: '1.0.0',
    launchedAt: 0,
    viewport: { width: 375, height: 812, pixelRatio: 2 }
  },

  onLaunch() {
    this.globalData.launchedAt = Date.now()
    let info = null
    if (typeof wx.getWindowInfo === 'function') {
      info = wx.getWindowInfo()
    } else if (typeof wx.getSystemInfoSync === 'function') {
      info = wx.getSystemInfoSync()
    }
    if (info) {
      this.globalData.viewport = {
        width: info.windowWidth || 375,
        height: info.windowHeight || 812,
        pixelRatio: info.pixelRatio || 2
      }
    }
  },

  onShow() {},

  onError(error) {
    console.error('[3d-lab] error', error)
  }
})
