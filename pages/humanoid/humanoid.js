// pages/humanoid/humanoid.js —— WebGL 人形机器人：GLB 资产 + 骨骼动画 + 环形步行
const { createScopedThreejs } = require('../../lib/three.miniprogram.js')
const { registerGLTFLoader } = require('../../lib/gltf-loader.js')
const MODEL_BASE64 = require('../../lib/robot-model.js')
const humanoid = require('../../utils/humanoid')
const haptics = require('../../utils/haptics')

const ASSET = {
  name: 'RobotExpressive',
  source: 'three.js examples',
  license: 'CC0 1.0',
  bytes: 463988
}

const MOTION_KEYS = humanoid.MOTIONS.map(function (motion) {
  return motion.key
})

Page({
  data: {
    motions: humanoid.MOTIONS,
    motion: 'Walking',
    motionName: '步行',
    autoOrbit: false,
    loading: true,
    error: '',
    fps: 0,
    stats: {
      triangles: 0,
      bones: 0,
      clips: 0,
      assetKb: Math.round(ASSET.bytes / 1024)
    },
    asset: ASSET
  },

  onReady() {
    this._alive = true
    this.initScene()
  },

  onUnload() {
    this._alive = false
    if (this.canvas && typeof this.canvas.cancelAnimationFrame === 'function') {
      this.canvas.cancelAnimationFrame(this._raf)
    }
    if (this.mixer) this.mixer.stopAllAction()
    if (this.renderer && typeof this.renderer.dispose === 'function') {
      this.renderer.dispose()
    }
  },

  fail(error) {
    if (!this._alive) return
    const message =
      error && (error.message || error.errMsg)
        ? error.message || error.errMsg
        : String(error || '未知错误')
    console.error('[humanoid]', message)
    this.setData({ loading: false, error: String(message).slice(0, 180) })
  },

  initScene() {
    const query = wx.createSelectorQuery()
    query
      .select('#humanoid-canvas')
      .node()
      .select('.gl-stage')
      .boundingClientRect()
      .exec((result) => {
        if (!this._alive) return
        const canvas = result && result[0] && result[0].node
        if (!canvas) {
          this.fail('未找到 WebGL canvas')
          return
        }
        this.canvas = canvas
        try {
          const THREE = createScopedThreejs(canvas)
          this.THREE = THREE
          registerGLTFLoader(THREE)
          this.buildScene(canvas, THREE, result[1])
        } catch (error) {
          this.fail(error)
        }
      })
  },

  buildScene(canvas, THREE, rect) {
    const info =
      typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const dpr = Math.min(info.pixelRatio || 2, 2)
    const width = Math.max(1, Math.round((rect && rect.width ? rect.width : 343) * dpr))
    const height = Math.max(1, Math.round((rect && rect.height ? rect.height : 410) * dpr))

    try {
      canvas.width = width
      canvas.height = height
    } catch (error) {
      console.warn('[humanoid] canvas resize failed', error)
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x05070f, 1)
    renderer.gammaOutput = true
    renderer.gammaFactor = 2.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x05070f)
    scene.fog = new THREE.Fog(0x05070f, 10, 22)
    this.scene = scene

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60)
    camera.position.set(3.8, 3.0, 6.4)
    camera.lookAt(0, 1.25, 0)
    this.camera = camera

    scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x1a2334, 0.9))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05)
    keyLight.position.set(5, 8, 6)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    keyLight.shadow.camera.left = -6
    keyLight.shadow.camera.right = 6
    keyLight.shadow.camera.top = 6
    keyLight.shadow.camera.bottom = -6
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 25
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(0x5eead4, 1.1, 16)
    rimLight.position.set(-4.5, 2.6, -3)
    scene.add(rimLight)

    const warmLight = new THREE.PointLight(0xfb923c, 0.9, 14)
    warmLight.position.set(3.5, 1.4, 4.2)
    scene.add(warmLight)

    const fillLight = new THREE.PointLight(0x7dd3fc, 0.55, 12)
    fillLight.position.set(1.6, 3.2, 5.2)
    scene.add(fillLight)

    this.buildStage(THREE, scene)
    this.buildStars(THREE, scene)

    this.robotRoot = new THREE.Group()
    this.robotRoot.position.set(0, 0.04, 0)
    this.robotRoot.rotation.y = 0.14
    scene.add(this.robotRoot)

    this.mixer = null
    this.actions = {}
    this.activeAction = null
    this.camTheta = humanoid.CAMERA.theta
    this.camPhi = humanoid.CAMERA.phi
    this.camRadius = humanoid.CAMERA.radius
    this._dragging = false
    this._pinch = null
    this._cameraTouch = null
    this._frames = 0
    this._fpsAt = Date.now()
    this.clock = new THREE.Clock()

    this.loadModel(THREE)
    this.animate()
  },

  buildStage(THREE, scene) {
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1728,
      metalness: 0.72,
      roughness: 0.42
    })
    const platform = new THREE.Mesh(
      new THREE.CylinderBufferGeometry(3.02, 3.22, 0.18, 64),
      platformMaterial
    )
    platform.position.y = -0.09
    platform.receiveShadow = true
    scene.add(platform)

    const ring = new THREE.Mesh(
      new THREE.TorusBufferGeometry(3.04, 0.022, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0x5eead4 })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.015
    scene.add(ring)

    const innerRing = new THREE.Mesh(
      new THREE.TorusBufferGeometry(1.92, 0.008, 6, 96),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    )
    innerRing.rotation.x = -Math.PI / 2
    innerRing.position.y = 0.012
    scene.add(innerRing)

    const grid = new THREE.GridHelper(6.2, 20, 0x1f4a5a, 0x102331)
    grid.position.y = 0.005
    grid.material.transparent = true
    grid.material.opacity = 0.28
    scene.add(grid)
  },

  buildStars(THREE, scene) {
    const count = 130
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399963
      const radius = 4.5 + ((index * 37) % 100) / 100 * 7
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = 0.6 + ((index * 53) % 100) / 100 * 6.5
      positions[index * 3 + 2] = Math.sin(angle) * radius
    }
    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x9ee8ff,
        size: 0.035,
        transparent: true,
        opacity: 0.65,
        sizeAttenuation: true
      })
    )
    scene.add(points)
  },

  loadModel(THREE) {
    let buffer
    try {
      buffer = wx.base64ToArrayBuffer(MODEL_BASE64)
    } catch (error) {
      this.fail('GLB 解码失败：' + (error.message || error))
      return
    }

    const loader = new THREE.GLTFLoader()
    loader.parse(
      buffer,
      '',
      (gltf) => {
        if (!this._alive) return
        try {
          this.attachModel(THREE, gltf)
        } catch (error) {
          this.fail(error)
        }
      },
      (error) => {
        this.fail(error || 'GLB 解析失败')
      }
    )
  },

  attachModel(THREE, gltf) {
    const model = gltf.scene
    model.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const scale = size.y > 0 ? 2.32 / size.y : 1

    model.scale.setScalar(scale)
    model.position.x = -center.x * scale
    model.position.z = -center.z * scale
    model.position.y = -box.min.y * scale

    let triangles = 0
    let bones = 0
    model.traverse((object) => {
      if (object.isBone) bones += 1
      if (!object.isMesh) return
      object.castShadow = true
      object.receiveShadow = true
      object.frustumCulled = false
      if (object.geometry) {
        const geometry = object.geometry
        if (geometry.index) triangles += geometry.index.count / 3
        else if (geometry.attributes.position) {
          triangles += geometry.attributes.position.count / 3
        }
      }
      object.material = this.styleMaterial(THREE, object.material)
    })

    this.robotRoot.add(model)
    this.model = model
    this.mixer = new THREE.AnimationMixer(model)
    this.actions = {}
    gltf.animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      this.actions[clip.name] = action
    })

    this.playMotion(this.data.motion, 0)
    this.setData({
      loading: false,
      stats: {
        triangles: Math.round(triangles),
        bones,
        clips: gltf.animations.length,
        assetKb: Math.round(ASSET.bytes / 1024)
      }
    })
  },

  styleMaterial(THREE, source) {
    if (!source) return source
    if (Array.isArray(source)) return source.map((item) => this.styleMaterial(THREE, item))
    const material = source.clone()
    const name = source.name || ''
    if (name === 'Main') {
      material.color.setHex(0xe4ebf5)
      material.metalness = 0.46
      material.roughness = 0.26
      material.emissive.setHex(0x060a12)
      material.emissiveIntensity = 0.4
    } else if (name === 'Black') {
      material.color.setHex(0x05080f)
      material.metalness = 0.4
      material.roughness = 0.2
      material.emissive.setHex(0x083a48)
      material.emissiveIntensity = 0.85
    } else if (name === 'Grey') {
      material.color.setHex(0x2f4058)
      material.metalness = 0.82
      material.roughness = 0.24
    }
    material.needsUpdate = true
    return material
  },

  playMotion(name, fade) {
    const action = this.actions[name]
    if (!action) {
      this.pendingMotion = name
      return
    }
    const duration = fade == null ? 0.28 : fade
    const previous = this.activeAction
    if (previous && previous !== action && duration > 0) previous.fadeOut(duration)
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1)
    if (duration > 0) action.fadeIn(duration)
    action.play()
    this.activeAction = action
  },

  animate() {
    if (!this._alive) return
    const canvas = this.canvas
    const raf =
      canvas && typeof canvas.requestAnimationFrame === 'function'
        ? canvas.requestAnimationFrame.bind(canvas)
        : (callback) => setTimeout(callback, 16)
    this._raf = raf(() => this.animate())

    const delta = Math.min(this.clock.getDelta(), 0.05)
    if (this.mixer) this.mixer.update(delta)

    if (this.data.autoOrbit && !this._dragging) this.camTheta += delta * 0.055
    const cameraPosition = humanoid.cameraPosition(this.camTheta, this.camPhi, this.camRadius)
    this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    this.camera.lookAt(0, 1.22, 0)
    this.renderer.render(this.scene, this.camera)

    this._frames += 1
    const now = Date.now()
    if (now - this._fpsAt >= 1000) {
      this.setData({ fps: Math.round((this._frames * 1000) / (now - this._fpsAt)) })
      this._frames = 0
      this._fpsAt = now
    }
  },

  handleCanvasStart(event) {
    const touches = event.touches || []
    this._dragging = true
    if (touches.length >= 2) {
      this._pinch = {
        distance: this.touchDistance(touches[0], touches[1]),
        radius: this.camRadius
      }
      this._cameraTouch = null
      return
    }
    this._pinch = null
    if (!touches.length) return
    this._cameraTouch = {
      x: touches[0].clientX,
      y: touches[0].clientY,
      theta: this.camTheta,
      phi: this.camPhi
    }
  },

  handleCanvasMove(event) {
    const touches = event.touches || []
    if (touches.length >= 2) {
      if (!this._pinch) {
        this._pinch = {
          distance: this.touchDistance(touches[0], touches[1]),
          radius: this.camRadius
        }
        return
      }
      const distance = this.touchDistance(touches[0], touches[1])
      if (!distance || !this._pinch.distance) return
      this.camRadius = Math.min(
        12,
        Math.max(4.2, this._pinch.radius * (this._pinch.distance / distance))
      )
      return
    }
    if (!this._cameraTouch || !touches.length) return
    const dx = touches[0].clientX - this._cameraTouch.x
    const dy = touches[0].clientY - this._cameraTouch.y
    this.camTheta = this._cameraTouch.theta - dx * 0.006
    this.camPhi = humanoid.clampPhi(this._cameraTouch.phi + dy * 0.005)
  },

  handleCanvasEnd(event) {
    const touches = event.touches || []
    if (!touches.length) {
      this._dragging = false
      this._pinch = null
      this._cameraTouch = null
      return
    }
    if (touches.length === 1) {
      this._pinch = null
      this._cameraTouch = {
        x: touches[0].clientX,
        y: touches[0].clientY,
        theta: this.camTheta,
        phi: this.camPhi
      }
    }
  },

  touchDistance(a, b) {
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.sqrt(dx * dx + dy * dy)
  },

  handleMotion(event) {
    const key = event.currentTarget.dataset.motion
    if (!key || MOTION_KEYS.indexOf(key) < 0 || key === this.data.motion) return
    const motion = humanoid.motionOf(key)
    haptics.tap()
    this.setData({ motion: key, motionName: motion.name })
    this.playMotion(key, 0.28)
  },

  handleAutoOrbit() {
    haptics.tap()
    this.setData({ autoOrbit: !this.data.autoOrbit })
  },

  handleResetCamera() {
    haptics.tap()
    this.camTheta = humanoid.CAMERA.theta
    this.camPhi = humanoid.CAMERA.phi
    this.camRadius = humanoid.CAMERA.radius
  },

  onShareAppMessage() {
    return {
      title: '3D LAB · WebGL 人形机器人步行演示',
      path: '/pages/humanoid/humanoid'
    }
  }
})
