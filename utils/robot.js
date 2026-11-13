// utils/robot.js —— 机械臂几何与正运动学（纯函数，便于冒烟测试）
const { clamp, round } = require('./3d')

// 单位统一按 mm 理解：1rpx 在 750 设计稿中约等于 1mm，读数只用于演示比例
const LINK_LENGTHS = {
  base: 150,
  upper: 250,
  fore: 210,
  wrist: 115
}

const POSE_LIMITS = {
  yaw: { min: -160, max: 160 },
  shoulder: { min: -45, max: 65 },
  elbow: { min: -135, max: 10 },
  wrist: { min: -85, max: 85 }
}

const TOTAL_REACH = LINK_LENGTHS.upper + LINK_LENGTHS.fore + LINK_LENGTHS.wrist

function toRadians(degrees) {
  return (Number(degrees) * Math.PI) / 180
}

function clampPose(pose) {
  const source = pose || {}
  const result = {}
  Object.keys(POSE_LIMITS).forEach(function (key) {
    const limit = POSE_LIMITS[key]
    result[key] = round(clamp(source[key] == null ? 0 : source[key], limit.min, limit.max), 0)
  })
  return result
}

/**
 * 正运动学：底座偏航 + 肩 / 肘 / 腕三段俯仰。
 * 返回末端在“地面坐标系”中的位置（x / y 水平，z 高度）。
 */
function forwardKinematics(pose) {
  const safe = clampPose(pose)
  const yaw = toRadians(safe.yaw)
  const shoulder = toRadians(safe.shoulder)
  const elbow = toRadians(safe.shoulder + safe.elbow)
  const wrist = toRadians(safe.shoulder + safe.elbow + safe.wrist)

  const radius =
    LINK_LENGTHS.upper * Math.sin(shoulder) +
    LINK_LENGTHS.fore * Math.sin(elbow) +
    LINK_LENGTHS.wrist * Math.sin(wrist)

  const height =
    LINK_LENGTHS.base +
    LINK_LENGTHS.upper * Math.cos(shoulder) +
    LINK_LENGTHS.fore * Math.cos(elbow) +
    LINK_LENGTHS.wrist * Math.cos(wrist)

  const reach = Math.sqrt(
    radius * radius + Math.pow(height - LINK_LENGTHS.base, 2)
  )

  return {
    x: round(radius * Math.sin(yaw), 0),
    y: round(radius * Math.cos(yaw), 0),
    z: round(height, 0),
    radius: round(radius, 0),
    reach: round(reach, 0)
  }
}

function reachPercent(kinematics) {
  const reach = kinematics && typeof kinematics.reach === 'number' ? kinematics.reach : 0
  return Math.round(clamp((reach / TOTAL_REACH) * 100, 0, 100))
}

function reachLabel(kinematics) {
  const reach = kinematics && typeof kinematics.reach === 'number' ? kinematics.reach : 0
  const meters = Math.round(reach / 10) / 100
  return meters.toFixed(2) + ' m'
}

module.exports = {
  LINK_LENGTHS,
  POSE_LIMITS,
  TOTAL_REACH,
  clampPose,
  forwardKinematics,
  reachPercent,
  reachLabel
}
