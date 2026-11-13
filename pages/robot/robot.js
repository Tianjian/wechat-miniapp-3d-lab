// pages/robot/robot.js —— 四轴机械臂：关节拖拽、相机环绕、预设姿态与正运动学读数
const content = require('../../utils/content')
const robot = require('../../utils/robot')
const { clamp, distanceBetween, percentLabel, round } = require('../../utils/3d')
const haptics = require('../../utils/haptics')

const CAM_X = 12
const CAM_Y = -26
const CAM_ZOOM = 0.9
const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.4

const JOINT_BY_KEY = {}
content.ROBOT_JOINTS.forEach(function (joint) {
  JOINT_BY_KEY[joint.key] = joint
})

Page({
  data: {
    pose: content.ROBOT_PRESETS[0].pose,
    joints: content.ROBOT_JOINTS,
    presets: content.ROBOT_PRESETS,
    baseFaces: content.ROBOT_BASE_FACES,
    activeJoint: '',
    activeLabel: 'READY',
    activePreset: 'home',
    gripper: content.ROBOT_PRESETS[0].gripper,
    fingerLeftStyle: '',
    fingerRightStyle: '',
    camX: CAM_X,
    camY: CAM_Y,
    zoom: CAM_ZOOM,
    zoomLabel: '90%',
    cameraDragging: false,
    easing: false,
    kinematics: { x: 0, y: 0, z: 0, reach: 0 },
    reachPercent: 0,
    reachLabel: '0.00 m'
  },

  onLoad() {
    this.applyPose(content.ROBOT_PRESETS[0].pose, { easing: false })
    this.syncGripper(content.ROBOT_PRESETS[0].gripper)
  },

  applyPose(pose, options) {
    const clamped = robot.clampPose(pose)
    const kinematics = robot.forwardKinematics(clamped)
    this.setData({
      pose: clamped,
      kinematics,
      reachPercent: robot.reachPercent(kinematics),
      reachLabel: robot.reachLabel(kinematics),
      easing: !!(options && options.easing)
    })
  },

  syncGripper(value) {
    const open = clamp(Number(value) || 0, 0, 1)
    this.setData({
      gripper: open,
      fingerLeftStyle:
        'transform: translateX(' +
        round(-10 - open * 26, 1) +
        'rpx) rotateZ(' +
        round(-7 - open * 12, 1) +
        'deg);',
      fingerRightStyle:
        'transform: translateX(' +
        round(10 + open * 26, 1) +
        'rpx) rotateZ(' +
        round(7 + open * 12, 1) +
        'deg);'
    })
  },

  handleJointStart(event) {
    const key = event.currentTarget.dataset.joint
    const joint = JOINT_BY_KEY[key]
    const touch = event.touches && event.touches[0]
    if (!joint || !touch) return
    this._joint = {
      key,
      joint,
      x: touch.clientX,
      y: touch.clientY,
      value: this.data.pose[key]
    }
    haptics.tap()
    this.setData({
      activeJoint: key,
      activeLabel: joint.name,
      activePreset: '',
      easing: false
    })
  },

  handleJointMove(event) {
    if (!this._joint) return
    const touch = event.touches && event.touches[0]
    if (!touch) return
    const dx = touch.clientX - this._joint.x
    const dy = touch.clientY - this._joint.y
    const joint = this._joint.joint
    const delta = joint.axis === 'Y' ? dx * 0.6 : -dy * 0.55
    const pose = Object.assign({}, this.data.pose)
    pose[joint.key] = round(
      clamp(this._joint.value + delta, joint.min, joint.max),
      0
    )
    this.applyPose(pose, { easing: false })
  },

  handleJointEnd() {
    if (!this._joint) return
    this._joint = null
    haptics.tap()
  },

  handleStageStart(event) {
    const touches = event.touches || []
    this.setData({ cameraDragging: true })
    if (touches.length >= 2) {
      this._pinch = {
        distance: distanceBetween(touches[0], touches[1]),
        zoom: this.data.zoom
      }
      this._camera = null
      return
    }
    this._pinch = null
    if (!touches.length) return
    this._camera = {
      x: touches[0].clientX,
      y: touches[0].clientY,
      camX: this.data.camX,
      camY: this.data.camY
    }
  },

  handleStageMove(event) {
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
      const zoom = clamp(
        this._pinch.zoom * (distance / this._pinch.distance),
        ZOOM_MIN,
        ZOOM_MAX
      )
      this.setData({ zoom: round(zoom, 2), zoomLabel: percentLabel(zoom) })
      return
    }
    if (!this._camera) return
    const dx = touches[0].clientX - this._camera.x
    const dy = touches[0].clientY - this._camera.y
    this.setData({
      camX: clamp(round(this._camera.camX + dy * 0.2, 1), -6, 38),
      camY: clamp(round(this._camera.camY + dx * 0.3, 1), -70, 70)
    })
  },

  handleStageEnd(event) {
    const touches = event.touches || []
    if (!touches.length) {
      this._camera = null
      this._pinch = null
      this.setData({ cameraDragging: false })
      return
    }
    if (touches.length === 1) {
      this._pinch = null
      this._camera = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        camX: this.data.camX,
        camY: this.data.camY
      }
    }
  },

  handleCameraReset() {
    haptics.tap()
    this.setData({
      camX: CAM_X,
      camY: CAM_Y,
      zoom: CAM_ZOOM,
      zoomLabel: '90%',
      cameraDragging: false
    })
  },

  handlePreset(event) {
    const key = event.currentTarget.dataset.key
    const preset = content.ROBOT_PRESETS.find(function (item) {
      return item.key === key
    })
    if (!preset) return
    haptics.tap()
    this.applyPose(preset.pose, { easing: true })
    this.syncGripper(preset.gripper)
    this.setData({
      activePreset: preset.key,
      activeJoint: '',
      activeLabel: preset.name
    })
  },

  handleGripper() {
    const next = this.data.gripper > 0.5 ? 0.08 : 0.9
    haptics.tap()
    this.syncGripper(next)
    this.setData({ activePreset: '' })
  },

  handleReset() {
    const preset = content.ROBOT_PRESETS[0]
    haptics.tap()
    this.applyPose(preset.pose, { easing: true })
    this.syncGripper(preset.gripper)
    this.setData({
      activePreset: 'home',
      activeJoint: '',
      activeLabel: 'HOME',
      camX: CAM_X,
      camY: CAM_Y,
      zoom: CAM_ZOOM,
      zoomLabel: '90%',
      cameraDragging: false
    })
  },

  onShareAppMessage() {
    return {
      title: '3D LAB · 可拖拽的四轴机械臂',
      path: '/pages/robot/robot'
    }
  }
})
