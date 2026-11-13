// 3d-lab/scripts/lib/smoke.mjs —— 在 Node 里 mock 小程序运行时，执行页面与组件逻辑
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)

export async function runSmoke(options = {}) {
  const log = options.log || function () {}
  const results = []
  const calls = []
  const motion = { handler: null }

  function record(name, payload) {
    calls.push({ name, payload })
  }

  function lastCall(name) {
    for (let i = calls.length - 1; i >= 0; i -= 1) {
      if (calls[i].name === name) return calls[i]
    }
    return null
  }

  const wx = {
    getWindowInfo() {
      return { windowWidth: 375, windowHeight: 812, pixelRatio: 3 }
    },
    getSystemInfoSync() {
      return { windowWidth: 375, windowHeight: 812, pixelRatio: 3 }
    },
    navigateTo(options) {
      record('navigateTo', options)
    },
    showToast(options) {
      record('showToast', options)
    },
    vibrateShort(options) {
      record('vibrateShort', options)
    },
    startDeviceMotionListening(options) {
      record('startDeviceMotionListening', options)
      if (options && typeof options.success === 'function') options.success({})
    },
    stopDeviceMotionListening(options) {
      record('stopDeviceMotionListening', options)
    },
    onDeviceMotionChange(handler) {
      motion.handler = handler
    },
    offDeviceMotionChange(handler) {
      if (motion.handler === handler) motion.handler = null
    },
    setNavigationBarTitle(options) {
      record('setNavigationBarTitle', options)
    }
  }

  let appConfig = null
  let pageConfig = null
  let componentConfig = null
  let appInstance = null

  globalThis.wx = wx
  globalThis.App = function (config) {
    appConfig = config
  }
  globalThis.Page = function (config) {
    pageConfig = config
  }
  globalThis.Component = function (config) {
    componentConfig = config
  }
  globalThis.getApp = function () {
    return appInstance
  }
  globalThis.getCurrentPages = function () {
    return []
  }

  async function test(name, fn) {
    try {
      const detail = await fn()
      results.push({ ok: true, name })
      log('  ✓ ' + name + (detail ? '  ' + detail : ''))
    } catch (error) {
      results.push({ ok: false, name, message: error && error.message })
      log('  ✗ ' + name + '  → ' + (error && error.message))
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message)
  }

  function assertEqual(actual, expected, label) {
    if (actual !== expected) {
      throw new Error(
        (label || '断言失败') + '：期望 ' + JSON.stringify(expected) + '，实际 ' + JSON.stringify(actual)
      )
    }
  }

  function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value))
  }

  function setPath(target, keyPath, value) {
    const segments = String(keyPath)
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(Boolean)
    let cursor = target
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]
      if (cursor[segment] === undefined || cursor[segment] === null) {
        cursor[segment] = /^\d+$/.test(segments[i + 1]) ? [] : {}
      }
      cursor = cursor[segment]
    }
    cursor[segments[segments.length - 1]] = value
  }

  function createPage(config) {
    const instance = {}
    Object.keys(config).forEach(function (key) {
      if (key !== 'data') instance[key] = config[key]
    })
    instance.data = clone(config.data || {})
    instance.setData = function (patch, callback) {
      Object.keys(patch).forEach(function (key) {
        setPath(instance.data, key, patch[key])
      })
      if (typeof callback === 'function') callback()
    }
    return instance
  }

  function createComponent(config) {
    const instance = { data: {}, events: [] }
    const properties = config.properties || {}
    Object.keys(properties).forEach(function (key) {
      const definition = properties[key] || {}
      instance.data[key] = Object.prototype.hasOwnProperty.call(definition, 'value')
        ? clone(definition.value)
        : null
    })
    Object.assign(instance.data, clone(config.data || {}))
    instance.setData = function (patch, callback) {
      Object.keys(patch).forEach(function (key) {
        setPath(instance.data, key, patch[key])
      })
      if (typeof callback === 'function') callback()
    }
    instance.triggerEvent = function (name, detail) {
      instance.events.push({ name, detail })
    }
    Object.assign(instance, config.methods || {})
    return instance
  }

  function loadModule(relativePath) {
    const absolute = path.join(ROOT, relativePath)
    delete require.cache[require.resolve(absolute)]
    return require(absolute)
  }

  function loadPage(relativePath) {
    pageConfig = null
    loadModule(relativePath)
    assert(pageConfig, '页面没有调用 Page()：' + relativePath)
    return pageConfig
  }

  function loadComponent(relativePath) {
    componentConfig = null
    loadModule(relativePath)
    assert(componentConfig, '组件没有调用 Component()：' + relativePath)
    return componentConfig
  }

  function touch(x, y) {
    return { clientX: x, clientY: y }
  }

  const math = require(path.join(ROOT, 'utils/3d.js'))
  const content = require(path.join(ROOT, 'utils/content.js'))
  const appJson = require(path.join(ROOT, 'app.json'))

  await test('app.js：注册 App 并记录视口', async () => {
    loadModule('app.js')
    assert(appConfig, 'app.js 未调用 App()')
    appInstance = createPage(appConfig)
    appInstance.onLaunch()
    appInstance.onShow()
    assertEqual(appInstance.globalData.version, '1.0.0', '版本号')
    assertEqual(appInstance.globalData.viewport.width, 375, '视口宽度')
    assert(appInstance.globalData.launchedAt > 0, 'launchedAt 应被写入')
    return 'globalData 正常'
  })

  await test('utils/3d：夹取 / 插值 / 动量 / 环形偏移', async () => {
    assertEqual(math.clamp(5, 0, 3), 3, 'clamp 上界')
    assertEqual(math.clamp('abc', 2, 9), 2, 'clamp 非法值回退下界')
    assertEqual(math.lerp(0, 10, 0.25), 2.5, 'lerp')
    assertEqual(math.round(1.2345, 2), 1.23, 'round')
    assertEqual(math.momentum(10, 0.5, 100, -90, 90), 60, 'momentum')
    assertEqual(math.momentum(85, 10, 100, -90, 90), 90, 'momentum 夹取')
    const tilt = math.tiltFromDelta(100, -50, { sensitivity: 0.1, max: 12 })
    assertEqual(tilt.ry, 10, 'tilt.ry')
    assertEqual(tilt.rx, 5, 'tilt.rx')
    assertEqual(math.circularOffset(0, 4, 5), 1, 'circularOffset 环绕')
    assertEqual(math.circularOffset(2, 0, 5), 2, 'circularOffset 正向')
    assertEqual(math.wrapIndex(-1, 5), 4, 'wrapIndex')
    assertEqual(math.percentLabel(1.234), '123%', 'percentLabel')
    assertEqual(math.distanceBetween(touch(0, 0), touch(3, 4)), 5, 'distanceBetween')
    return '11 个断言'
  })

  await test('utils/content：演示数量与确定性星点', async () => {
    assertEqual(content.DEMOS.length, 6, '演示模块数')
    assertEqual(content.CUBE_FACES.length, 6, '立方体面数')
    assertEqual(content.SLIDES.length, 5, '轮播卡片数')
    assertEqual(content.ROBOT_PRESETS.length, 4, '机械臂预设数')
    assertEqual(content.ROBOT_JOINTS.length, 4, '机械臂关节数')
    assertEqual(content.ROBOT_BASE_FACES.length, 14, '底座面片数')
    assertEqual(new Set(content.CUBE_FACES.map((face) => face.key)).size, 6, '面 key 唯一')
    const pages = appJson.pages
    content.DEMOS.forEach(function (demo) {
      assert(pages.indexOf(demo.path.replace(/^\//, '')) >= 0, '演示未注册：' + demo.path)
    })
    const first = JSON.stringify(content.createStars(8))
    const second = JSON.stringify(content.createStars(8))
    assertEqual(first, second, '星点应确定性生成')
    const stars = content.createStars(8)
    assertEqual(stars.length, 8, '星点数量')
    assert(stars.every((star) => star.x >= 0 && star.x <= 100), '星点 x 范围')
    assert(stars.every((star) => star.size > 0), '星点尺寸')
    return '6 / 6 / 5 / 4，路径均已注册'
  })

  await test('utils/humanoid：动作、相机与环形轨迹', async () => {
    const h = require(path.join(ROOT, 'utils/humanoid.js'))
    assertEqual(h.MOTIONS.length, 4, '动作数量')
    assertEqual(h.speedOf('Walking'), 0.55, '步行速度')
    assertEqual(h.speedOf('Idle'), 0, '待机速度')
    assertEqual(h.motionOf('Dance').name, '舞蹈', '动作名称')

    // phi 会被 clamp 到最小 0.04，因此按 0.04 验证球坐标
    const front = h.cameraPosition(0, 0.04, 10, 1.2)
    assertEqual(front.x, 0, '相机 x')
    assert(Math.abs(front.y - (1.2 + Math.sin(0.04) * 10)) < 1e-9, '相机 y')
    assert(Math.abs(front.z - Math.cos(0.04) * 10) < 1e-9, '相机 z')

    const walk0 = h.walkTransform(0, 2)
    assertEqual(walk0.x, 2, '轨迹 x')
    assertEqual(walk0.z, 0, '轨迹 z')
    assertEqual(walk0.rotationY, 0, '轨迹朝向')

    const walk90 = h.walkTransform(Math.PI / 2, 2)
    assert(Math.abs(walk90.x) < 1e-9, '四分之一圈 x')
    assertEqual(walk90.z, 2, '四分之一圈 z')
    assert(Math.abs(walk90.rotationY + Math.PI / 2) < 1e-9, '切向朝向')
    assertEqual(h.clampPhi(5), 0.95, '相机俯仰上限')
    return '动作 / 球坐标 / 轨迹'
  })

  await test('assets：RobotExpressive GLB 已内联', async () => {
    const base64 = require(path.join(ROOT, 'lib/robot-model.js'))
    assert(base64.length > 600000, 'base64 长度')
    const bytes = Buffer.from(base64, 'base64')
    assertEqual(bytes.toString('ascii', 0, 4), 'glTF', 'GLB magic')
    assertEqual(bytes.readUInt32LE(4), 2, 'GLB version')
    assert(bytes.length > 450000, 'GLB 体积')
    return Math.round(bytes.length / 1024) + ' KB'
  })

  await test('utils/robot：正运动学与关节限位', async () => {
    const robot = require(path.join(ROOT, 'utils/robot.js'))
    const zero = robot.forwardKinematics({ yaw: 0, shoulder: 0, elbow: 0, wrist: 0 })
    assertEqual(zero.x, 0, '零位 x')
    assertEqual(zero.y, 0, '零位 y')
    assertEqual(zero.z, 725, '零位高度')
    assertEqual(zero.reach, 575, '零位伸展')

    // shoulder 上限为 65°，因此在最大许可角度下验证水平伸展
    const extended = robot.forwardKinematics({ yaw: 90, shoulder: 65, elbow: 0, wrist: 0 })
    assertEqual(extended.x, 521, '最大伸展 x')
    assertEqual(extended.z, 393, '最大伸展 z')

    const clamped = robot.clampPose({ yaw: 999, shoulder: 999, elbow: -999, wrist: 999 })
    assertEqual(clamped.yaw, 160, 'yaw 限位')
    assertEqual(clamped.shoulder, 65, 'shoulder 限位')
    assertEqual(clamped.elbow, -135, 'elbow 限位')
    assertEqual(clamped.wrist, 85, 'wrist 限位')

    assertEqual(robot.reachPercent({ reach: 575 }), 100, 'reachPercent')
    assertEqual(robot.reachLabel({ reach: 575 }), '0.58 m', 'reachLabel')
    return '零位 / 伸展 / 限位'
  })

  await test('首页：主视觉拖拽与入口跳转', async () => {
    const page = createPage(loadPage('pages/index/index.js'))
    page.onLoad()
    assertEqual(page.data.demos.length, 6, '入口数量')

    page.handleHeroStart({ touches: [touch(100, 100)] })
    page.handleHeroMove({ touches: [touch(160, 140)] })
    assert(page.data.heroY > 14, '右拖应增大 rotateY')
    assert(page.data.heroX < -10, '下拖应减小 rotateX')

    page.handleHeroEnd()
    assertEqual(page.data.heroY, 14, '松手回正 rotateY')
    assertEqual(page.data.heroX, -10, '松手回正 rotateX')

    page.handleOpenDemo({ detail: { key: 'scene' } })
    const nav = lastCall('navigateTo')
    assert(nav && nav.payload.url === '/pages/scene/scene', '入口跳转地址')
    return '拖拽 / 回正 / 跳转'
  })

  await test('立方体：拖拽角度、惯性、面片选择与重置', async () => {
    const page = createPage(loadPage('pages/cube/cube.js'))
    page.onLoad()
    assertEqual(page.data.rotX, -18, '初始 rotateX')
    assertEqual(page.data.rotY, 28, '初始 rotateY')

    page.handleTouchStart({ touches: [touch(100, 100)] })
    page.handleTouchMove({ touches: [touch(180, 140)] })
    assert(page.data.rotY > 28, '横拖应增大 rotateY')
    assert(page.data.rotX < -18, '纵拖应减小 rotateX')
    assertEqual(page.data.dragging, true, '拖动中')

    page.handleTouchEnd()
    assertEqual(page.data.dragging, false, '结束后取消拖动')
    assert(page.data.rotY <= 720 && page.data.rotY >= -720, 'rotateY 边界')

    page._moved = false
    page.handleFaceTap({ currentTarget: { dataset: { face: 'back' } } })
    assertEqual(page.data.activeFace, 'back', '选中面')
    assertEqual(page.data.faceInfo.title, 'TRANSLATE Z', '面片说明')
    assert(lastCall('vibrateShort'), '选择面片应有触觉反馈')

    page.handleAutoSpin()
    assertEqual(page.data.autoSpin, true, '重新开启自动旋转')

    page.handleReset()
    assertEqual(page.data.rotX, -18, '重置 rotateX')
    assertEqual(page.data.rotY, 28, '重置 rotateY')
    assertEqual(page.data.activeFace, 'front', '重置面片')
    return '角度 / 惯性 / 面片 / 重置'
  })

  await test('倾斜卡：跟手角度、高光与翻转', async () => {
    const page = createPage(loadPage('pages/tilt/tilt.js'))
    page.handleTouchStart({ touches: [touch(100, 100)] })
    page.handleTouchMove({ touches: [touch(160, 140)] })
    assert(page.data.ry > 0, '右拖 rotateY 为正')
    assert(page.data.rx < 0, '下拖 rotateX 为负')
    assertEqual(page.data.glare, 0.5, '拖动时出现高光')

    page.handleTouchEnd()
    assertEqual(page.data.rx, 0, '松手回正 rotateX')
    assertEqual(page.data.ry, 0, '松手回正 rotateY')
    assertEqual(page.data.glare, 0, '高光淡出')

    page._moved = false
    page.handleFlip()
    assertEqual(page.data.flipped, true, '翻转状态')
    assertEqual(page.data.side, 'BACK', '背面标记')

    page.handleReset()
    assertEqual(page.data.flipped, false, '重置为正面')
    assertEqual(page.data.side, 'FRONT', '重置标记')
    return '倾斜 / 高光 / 翻转 / 重置'
  })

  await test('轮播：环形偏移、滑动、按钮与点按', async () => {
    const page = createPage(loadPage('pages/coverflow/coverflow.js'))
    page.onLoad()
    assertEqual(page.data.cards.length, 5, '卡片数量')
    assertEqual(page.data.cards[0].offset, 0, '首张居中')
    assertEqual(page.data.info.title, 'DEPTH', '首张信息')
    assert(page.data.cards[0].style.indexOf('translateZ') >= 0, '卡片应使用 translateZ')

    page.handleNext()
    assertEqual(page.data.active, 1, '下一张')
    assertEqual(page.data.info.title, 'TILT', '信息同步')
    assertEqual(page.data.progress, 40, '进度')

    page.handlePrev()
    assertEqual(page.data.active, 0, '上一张')
    page.handlePrev()
    assertEqual(page.data.active, 4, '首张向前应环绕到末张')

    page.handleTouchStart({ touches: [touch(300, 300)] })
    page.handleTouchMove({ touches: [touch(220, 300)] })
    page.handleTouchEnd({ changedTouches: [touch(220, 300)] })
    assertEqual(page.data.active, 0, '左滑应前进并环绕')

    page.handleDot({ currentTarget: { dataset: { index: 2 } } })
    assertEqual(page.data.active, 2, '圆点选择')
    page._moved = false
    page.handleCardTap({ currentTarget: { dataset: { index: 4 } } })
    assertEqual(page.data.active, 4, '点按侧边卡片')
    page.handleReset()
    assertEqual(page.data.active, 0, '回到首张')
    return '偏移 / 滑动 / 环绕 / 点按'
  })

  await test('星域：拖拽、捏合缩放、陀螺仪与重置', async () => {
    const page = createPage(loadPage('pages/scene/scene.js'))
    page.onLoad()
    assertEqual(page.data.stars.length, 64, '星点数量')
    assert(page.data.worldStyle.indexOf('rotateX') >= 0, '初始世界变换')

    page.handleTouchStart({ touches: [touch(100, 100)] })
    page.handleTouchMove({ touches: [touch(200, 160)] })
    assertEqual(page.data.panX, 150, '横向平移')
    assertEqual(page.data.panY, 90, '纵向平移')
    page.handleTouchEnd({ touches: [] })
    assertEqual(page.data.dragging, false, '结束拖动')

    page.handleTouchStart({ touches: [touch(100, 100), touch(200, 100)] })
    page.handleTouchMove({ touches: [touch(100, 100), touch(300, 100)] })
    assertEqual(page.data.zoom, 1.8, '捏合放大到上限')
    assertEqual(page.data.zoomLabel, '180%', '缩放标签')
    page.handleTouchEnd({ touches: [] })

    page.handleGyroToggle()
    assertEqual(page.data.gyroOn, true, '陀螺仪开启')
    assertEqual(page.data.modeLabel, '陀螺仪', '模式标签')
    assert(motion.handler, '应注册陀螺仪回调')
    page._gyroAt = 0
    motion.handler({ gamma: 10, beta: 30 })
    assertEqual(page.data.panX, 26, '陀螺仪横向映射')
    assertEqual(page.data.panY, 20, '陀螺仪纵向映射')

    page.handleGyroToggle()
    assertEqual(page.data.gyroOn, false, '陀螺仪关闭')

    page.handleReset()
    assertEqual(page.data.panX, 0, '重置平移')
    assertEqual(page.data.zoom, 1, '重置缩放')
    page.onUnload()
    return '平移 / 缩放 / 陀螺仪 / 重置'
  })

  await test('机械臂：关节拖拽、相机、预设与夹爪', async () => {
    const page = createPage(loadPage('pages/robot/robot.js'))
    page.onLoad()
    assertEqual(page.data.activePreset, 'home', '初始预设')
    assert(page.data.kinematics.z > 300, '初始末端高度')
    assert(page.data.reachPercent > 0, '初始行程百分比')

    const shoulderBefore = page.data.pose.shoulder
    page.handleJointStart({
      currentTarget: { dataset: { joint: 'shoulder' } },
      touches: [touch(200, 300)]
    })
    page.handleJointMove({ touches: [touch(200, 240)] })
    assert(page.data.pose.shoulder > shoulderBefore, '上拖应增大肩角')
    assertEqual(page.data.activeJoint, 'shoulder', '当前关节')
    page.handleJointEnd()
    assertEqual(page.data.activePreset, '', '拖拽后退出预设')

    page.handleStageStart({ touches: [touch(100, 100)] })
    page.handleStageMove({ touches: [touch(180, 150)] })
    assert(page.data.camY !== -26, '相机水平环绕')
    page.handleStageEnd({ touches: [] })

    page.handleStageStart({ touches: [touch(100, 100), touch(200, 100)] })
    page.handleStageMove({ touches: [touch(100, 100), touch(280, 100)] })
    assert(page.data.zoom > 0.9, '双指放大')
    assertEqual(page.data.zoom, 1.4, '缩放到上限')
    page.handleStageEnd({ touches: [] })

    const fold = content.ROBOT_PRESETS.find(function (preset) {
      return preset.key === 'fold'
    })
    page.handlePreset({ currentTarget: { dataset: { key: 'fold' } } })
    assertEqual(page.data.pose.elbow, fold.pose.elbow, '预设角度')
    assertEqual(page.data.activePreset, 'fold', '预设高亮')
    assertEqual(page.data.easing, true, '预设启用过渡')

    const gripperBefore = page.data.gripper
    page.handleGripper()
    assert(page.data.gripper !== gripperBefore, '夹爪开合')

    page.handleReset()
    assertEqual(page.data.activePreset, 'home', '复位预设')
    assertEqual(page.data.camX, 12, '复位相机 X')
    assertEqual(page.data.zoom, 0.9, '复位缩放')
    assertEqual(page.data.activeJoint, '', '复位关节')
    return '关节 / 相机 / 预设 / 夹爪'
  })

  await test('组件 demo-card：倾斜与 open 事件', async () => {
    const card = createComponent(loadComponent('components/demo-card/demo-card.js'))
    card.data.code = 'cube'
    card.handleTouchStart({ touches: [touch(100, 100)] })
    card.handleTouchMove({ touches: [touch(160, 140)] })
    assert(card.data.ry > 0, '卡片应随横拖倾斜')
    card.handleTouchEnd()
    assertEqual(card.data.ry, 0, '松手回正')

    card._moved = false
    card.handleTap()
    assertEqual(card.events.length, 1, '事件数量')
    assertEqual(card.events[0].name, 'open', '事件名')
    assertEqual(card.events[0].detail.key, 'cube', '事件负载')
    return '倾斜 / 回正 / open'
  })

  await test('组件 stage-hint：action 事件', async () => {
    const hint = createComponent(loadComponent('components/stage-hint/stage-hint.js'))
    hint.handleAction()
    assertEqual(hint.events.length, 1, '事件数量')
    assertEqual(hint.events[0].name, 'action', '事件名')
    return 'action'
  })

  await test('utils/haptics：可用时触发震动', async () => {
    const haptics = require(path.join(ROOT, 'utils/haptics.js'))
    const before = calls.filter((call) => call.name === 'vibrateShort').length
    assertEqual(haptics.tap(), true, '返回可用')
    const after = calls.filter((call) => call.name === 'vibrateShort').length
    assertEqual(after, before + 1, '调用 vibrateShort')
    return 'vibrateShort'
  })

  const failed = results.filter(function (item) {
    return !item.ok
  })
  return { ok: failed.length === 0, total: results.length, results, failed }
}
