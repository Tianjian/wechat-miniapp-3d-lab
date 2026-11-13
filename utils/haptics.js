// utils/haptics.js —— 轻触觉反馈封装：低版本基础库或模拟器不可用时静默降级
function tap(type) {
  if (typeof wx === 'undefined' || typeof wx.vibrateShort !== 'function') return false
  try {
    wx.vibrateShort({ type: type || 'light' })
    return true
  } catch (error) {
    return false
  }
}

module.exports = { tap }
