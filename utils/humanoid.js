// utils/humanoid.js —— 人形机器人演示的纯函数：动作配置、相机球坐标与环形步行轨迹
const { clamp } = require('./3d')

const MOTIONS = [
  { key: 'Idle', label: 'IDLE', name: '待机', speed: 0, accent: '#5eead4' },
  { key: 'Walking', label: 'WALK', name: '步行', speed: 0.55, accent: '#fb923c' },
  { key: 'Running', label: 'RUN', name: '奔跑', speed: 1.15, accent: '#f472b6' },
  { key: 'Dance', label: 'DANCE', name: '舞蹈', speed: 0, accent: '#a78bfa' }
]

const WALK_RADIUS = 1.7

const CAMERA = {
  theta: 0.55,
  phi: 0.26,
  radius: 7.4,
  targetY: 1.25
}

const MOTION_BY_KEY = {}
MOTIONS.forEach(function (motion) {
  MOTION_BY_KEY[motion.key] = motion
})

function clampPhi(phi) {
  return clamp(phi, 0.04, 0.95)
}

/**
 * 相机球坐标 → 世界坐标。theta 绕 Y 轴，phi 抬高视角。
 */
function cameraPosition(theta, phi, radius, targetY) {
  const vertical = clampPhi(phi)
  const horizontalRadius = Math.cos(vertical) * radius
  return {
    x: Math.sin(theta) * horizontalRadius,
    y: (targetY == null ? CAMERA.targetY : targetY) + Math.sin(vertical) * radius,
    z: Math.cos(theta) * horizontalRadius
  }
}

/**
 * 让机器人沿半径 radius 的圆环行走。
 * 模型正面朝 +Z，速度为切向，因此 rotationY = -angle。
 */
function walkTransform(angle, radius) {
  const r = radius == null ? WALK_RADIUS : radius
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    rotationY: -angle
  }
}

function speedOf(key) {
  const motion = MOTION_BY_KEY[key]
  return motion ? motion.speed : 0
}

function motionOf(key) {
  return MOTION_BY_KEY[key] || MOTIONS[0]
}

module.exports = {
  MOTIONS,
  WALK_RADIUS,
  CAMERA,
  cameraPosition,
  clampPhi,
  walkTransform,
  speedOf,
  motionOf
}
