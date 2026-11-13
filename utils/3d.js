// utils/3d.js —— 3D 交互用纯函数：夹取、插值、动量、角度与手势换算
// 全部无副作用、不依赖 wx API，便于在 Node 中直接做冒烟测试。

function clamp(value, min, max) {
  const number = Number(value)
  if (Number.isNaN(number)) return min
  return Math.min(max, Math.max(min, number))
}

function lerp(from, to, t) {
  return from + (to - from) * clamp(t, 0, 1)
}

function round(value, digits) {
  const places = digits == null ? 1 : digits
  const base = Math.pow(10, places)
  return Math.round(Number(value) * base) / base
}

/** 速度：像素 / 毫秒 */
function velocityOf(distance, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0
  return distance / elapsedMs
}

/** 把速度投影成惯性目标角度，并夹在边界内 */
function momentum(current, velocity, factor, min, max) {
  const projected = Number(current) + Number(velocity) * (factor == null ? 220 : factor)
  return clamp(round(projected, 1), min == null ? -720 : min, max == null ? 720 : max)
}

/** 位移 → 倾斜角：向右拖 → rotateY 为正，向下拖 → rotateX 为正 */
function tiltFromDelta(dx, dy, options) {
  const opts = options || {}
  const sensitivity = opts.sensitivity == null ? 0.07 : opts.sensitivity
  const max = opts.max == null ? 14 : opts.max
  return {
    rx: clamp(round(-dy * sensitivity, 1), -max, max),
    ry: clamp(round(dx * sensitivity, 1), -max, max)
  }
}

/** 双指间距，用于捏合缩放 */
function distanceBetween(a, b) {
  if (!a || !b) return 0
  const dx = Number(a.clientX) - Number(b.clientX)
  const dy = Number(a.clientY) - Number(b.clientY)
  return Math.sqrt(dx * dx + dy * dy)
}

/** 环形偏移：把索引差折叠到 [-total/2, total/2]，让轮播首尾相接 */
function circularOffset(index, active, total) {
  if (!total || total < 1) return 0
  let offset = index - active
  const half = Math.floor(total / 2)
  if (offset > half) offset -= total
  if (offset < -half) offset += total
  return offset
}

function wrapIndex(index, total) {
  if (!total || total < 1) return 0
  return ((index % total) + total) % total
}

function percentLabel(value) {
  return Math.round(clamp(value, 0, 10) * 100) + '%'
}

module.exports = {
  clamp,
  lerp,
  round,
  velocityOf,
  momentum,
  tiltFromDelta,
  distanceBetween,
  circularOffset,
  wrapIndex,
  percentLabel
}
