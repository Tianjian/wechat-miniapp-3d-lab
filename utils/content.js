// utils/content.js —— 演示内容与确定性场景数据
// 纯数据 + 无随机副作用，冒烟测试可以直接断言数量与范围。
const { round } = require('./3d')

const DEMOS = [
  {
    key: 'cube',
    order: '01',
    title: '旋转立方体',
    desc: '六面体 · 拖拽惯性 · 自动旋转',
    tag: 'CUBE',
    accent: '#5eead4',
    path: '/pages/cube/cube'
  },
  {
    key: 'tilt',
    order: '02',
    title: '全息倾斜卡',
    desc: '跟手倾斜 · 高光追踪 · 双面翻转',
    tag: 'TILT',
    accent: '#a78bfa',
    path: '/pages/tilt/tilt'
  },
  {
    key: 'coverflow',
    order: '03',
    title: '景深轮播',
    desc: '3D Coverflow · 循环选择 · 层次投影',
    tag: 'FLOW',
    accent: '#f472b6',
    path: '/pages/coverflow/coverflow'
  },
  {
    key: 'scene',
    order: '04',
    title: '视差星域',
    desc: '陀螺仪 · 双指缩放 · 多层景深',
    tag: 'SPACE',
    accent: '#fbbf24',
    path: '/pages/scene/scene'
  },
  {
    key: 'robot',
    order: '05',
    title: '机械臂',
    desc: '四轴关节 · 拖拽姿态 · 正运动学',
    tag: 'ARM',
    accent: '#fb923c',
    path: '/pages/robot/robot'
  },
  {
    key: 'humanoid',
    order: '06',
    title: '人形机器人',
    desc: 'CC0 GLB · 步行动画 · WebGL 实时渲染',
    tag: 'HUMAN',
    accent: '#7dd3fc',
    path: '/pages/humanoid/humanoid'
  }
]

const CUBE_FACES = [
  {
    key: 'front',
    faceClass: 'face-front',
    kicker: 'FRONT',
    glyph: '3D',
    title: 'WECHAT 3D',
    metric: 'perspective',
    detail: '六块面片各沿 Z 轴推出半边长，preserve-3d 让它们真正围成一个立方体。'
  },
  {
    key: 'right',
    faceClass: 'face-right',
    kicker: 'RIGHT',
    glyph: 'Y',
    title: 'ROTATE Y',
    metric: 'rotateY',
    detail: '横向拖拽映射 rotateY；松手时按最近一次位移与时间估算速度，得到惯性目标角。'
  },
  {
    key: 'back',
    faceClass: 'face-back',
    kicker: 'BACK',
    glyph: 'Z',
    title: 'TRANSLATE Z',
    metric: 'translateZ',
    detail: '每个面固定在 ±170rpx 的深度上；改变视角时，面与面之间才有真实的遮挡关系。'
  },
  {
    key: 'left',
    faceClass: 'face-left',
    kicker: 'LEFT',
    glyph: 'X',
    title: 'ROTATE X',
    metric: 'rotateX',
    detail: '纵向拖拽映射 rotateX，并限制在 ±72°，避免翻转过头导致内容倒置。'
  },
  {
    key: 'top',
    faceClass: 'face-top',
    kicker: 'TOP',
    glyph: '°',
    title: 'TILT',
    metric: 'touch → deg',
    detail: '触摸事件不直接改样式，而是先换算成角度，再由 setData 驱动 transform 字符串。'
  },
  {
    key: 'bottom',
    faceClass: 'face-bottom',
    kicker: 'BOTTOM',
    glyph: '∞',
    title: 'INERTIA',
    metric: 'velocity',
    detail: '速度 = 位移 / 时间；把速度乘以衰减系数叠加到当前角度，就是一次简单的滑行。'
  }
]

const SLIDES = [
  {
    key: 'depth',
    index: '01',
    glyph: 'Z',
    title: 'DEPTH',
    subtitle: 'Z 轴叙事',
    desc: '把标题、卡片与光晕放进不同的 Z 平面，视角一动，层次自己会说话。',
    tags: ['translateZ', 'perspective'],
    accent: '#5eead4'
  },
  {
    key: 'tilt',
    index: '02',
    glyph: '↻',
    title: 'TILT',
    subtitle: '跟手倾斜',
    desc: '触摸位移映射为 rotateX / rotateY，指尖停下的位置决定高光落在哪里。',
    tags: ['rotateX', 'rotateY'],
    accent: '#a78bfa'
  },
  {
    key: 'orbit',
    index: '03',
    glyph: '◎',
    title: 'ORBIT',
    subtitle: '环绕轨道',
    desc: '同一组卡片按环形偏移排布，越靠边越远，自然形成 Coverflow。',
    tags: ['rotateY', 'scale'],
    accent: '#f472b6'
  },
  {
    key: 'light',
    index: '04',
    glyph: '✦',
    title: 'LIGHT',
    subtitle: '高光追踪',
    desc: '径向渐变跟随触点，玻璃材质因此对“光”的方向产生反馈。',
    tags: ['gradient', 'glare'],
    accent: '#fbbf24'
  },
  {
    key: 'flow',
    index: '05',
    glyph: '∞',
    title: 'FLOW',
    subtitle: '连续选择',
    desc: '循环偏移让首尾相接，滑动、点按与按钮共享同一份 active 状态。',
    tags: ['momentum', 'loop'],
    accent: '#38bdf8'
  }
]

const SCENE_PANELS = [
  { key: 'orbit', label: 'ORBIT', value: '0.42 AU' },
  { key: 'signal', label: 'SIGNAL', value: 'STABLE' },
  { key: 'depth', label: 'DEPTH', value: '4 LAYERS' }
]

const TILT_FEATURES = [
  { label: 'RENDERER', value: 'WEBVIEW' },
  { label: 'DEPTH', value: 'PRESERVE-3D' },
  { label: 'INPUT', value: 'TOUCH + MOTION' },
  { label: 'DEPENDENCY', value: 'ZERO' }
]

const HOME_STATS = [
  { value: '06', label: '交互模块' },
  { value: '06', label: '立方体面' },
  { value: '00', label: 'npm 安装' }
]

const ROBOT_JOINTS = [
  {
    key: 'yaw',
    code: 'J1',
    name: '底座偏航',
    axis: 'Y',
    min: -160,
    max: 160,
    hint: '左右拖动底座'
  },
  {
    key: 'shoulder',
    code: 'J2',
    name: '肩部俯仰',
    axis: 'X',
    min: -45,
    max: 65,
    hint: '上下拖动肩部关节'
  },
  {
    key: 'elbow',
    code: 'J3',
    name: '肘部俯仰',
    axis: 'X',
    min: -135,
    max: 10,
    hint: '上下拖动肘部关节'
  },
  {
    key: 'wrist',
    code: 'J4',
    name: '腕部俯仰',
    axis: 'X',
    min: -85,
    max: 85,
    hint: '上下拖动腕部关节'
  }
]

const ROBOT_PRESETS = [
  {
    key: 'home',
    name: 'HOME',
    pose: { yaw: -18, shoulder: 26, elbow: -58, wrist: 34 },
    gripper: 0.35
  },
  {
    key: 'reach',
    name: 'REACH',
    pose: { yaw: -42, shoulder: 55, elbow: -25, wrist: -20 },
    gripper: 0.75
  },
  {
    key: 'fold',
    name: 'FOLD',
    pose: { yaw: 22, shoulder: -8, elbow: -105, wrist: 50 },
    gripper: 0.1
  },
  {
    key: 'scan',
    name: 'SCAN',
    pose: { yaw: 52, shoulder: 32, elbow: -70, wrist: 45 },
    gripper: 0.85
  }
]

const ROBOT_BASE_FACES = []
for (let index = 0; index < 14; index += 1) {
  ROBOT_BASE_FACES.push({
    id: 'base-' + index,
    angle: round(index * (360 / 14), 2),
    lit: index === 0
  })
}

function fraction(value) {
  return value - Math.floor(value)
}

/**
 * 生成确定性的星点（无 Math.random），保证冒烟结果稳定。
 * x / y 为百分比，size 为 rpx，delay 为动画延迟秒数。
 */
function createStars(count) {
  const total = Math.max(1, Math.floor(count))
  const stars = []
  for (let i = 0; i < total; i += 1) {
    const a = fraction(Math.sin((i + 1) * 12.9898) * 43758.5453)
    const b = fraction(Math.sin((i + 1) * 78.233) * 12345.6789)
    const c = fraction(Math.sin((i + 1) * 37.719) * 24634.6345)
    stars.push({
      id: 'star-' + i,
      x: round(a * 100, 2),
      y: round(b * 100, 2),
      size: round(1.4 + c * 3.4, 1),
      delay: round(a * 4, 2),
      opacity: round(0.22 + c * 0.68, 2),
      depth: round(b, 2)
    })
  }
  return stars
}

module.exports = {
  DEMOS,
  CUBE_FACES,
  SLIDES,
  SCENE_PANELS,
  TILT_FEATURES,
  HOME_STATS,
  ROBOT_JOINTS,
  ROBOT_PRESETS,
  ROBOT_BASE_FACES,
  createStars
}
