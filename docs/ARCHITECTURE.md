# 架构说明

## 1. 总览

3D LAB 是一个原生微信小程序，入口为 `pages/index/index`，下挂 6 个独立实验：

| 实验 | 技术栈 | 渲染层 |
| --- | --- | --- |
| 旋转立方体 | CSS 3D | WebView |
| 全息倾斜卡 | CSS 3D | WebView |
| 景深轮播 | CSS 3D | WebView |
| 视差星域 | CSS 3D + DeviceMotion | WebView |
| 四轴机械臂 | CSS 3D 嵌套关节链 + FK | WebView |
| 人形机器人 | WebGL + three.js r108 | Canvas |

`app.json` 显式声明 `"renderer": "webview"`，确保 `transform-style: preserve-3d` 等 CSS 3D 能力可用。

## 2. 纯 CSS 3D 实验

### 2.1 坐标与透视

所有实验共享一套约定：

- 页面尺寸使用 `rpx`，750 设计稿；
- 舞台元素设置 `perspective`；
- 3D 容器设置 `transform-style: preserve-3d`；
- 面片使用 `translateZ` 推出深度，`backface-visibility` 控制背面；
- 动态 `transform` 通过内联 `style` 写入，避免为每一帧生成大量类名。

### 2.2 手势与数学

触摸事件只采集位移，角度/动量计算集中在 `utils/3d.js`：

- `clamp` / `lerp` / `round`
- `momentum`：速度投影为惯性目标角
- `tiltFromDelta`：位移 → `rotateX/rotateY`
- `circularOffset` / `wrapIndex`：Coverflow 环形选择
- `percentLabel`：缩放读数

### 2.3 机械臂

机械臂是四段嵌套关节链：

```text
robotRoot
└─ yaw (rotateY)
   └─ shoulder (rotateX)
      └─ elbow (translateY + rotateX)
         └─ wrist (translateY + rotateX)
            └─ gripper
```

每个关节只负责自己的局部旋转；父级姿态自动向下传递。连杆由四面盒子组成，关节使用球帽 + 双环增强立体感。

`utils/robot.js` 负责：

- 关节限位 `clampPose`
- 正运动学 `forwardKinematics`：四个角度 → 末端 `x/y/z`、`reach`
- 行程百分比与米制读数

## 3. WebGL 人形机器人

### 3.1 运行时

- `<canvas type="webgl">` 通过 `wx.createSelectorQuery().node()` 获取；
- `createScopedThreejs(canvas)`（`lib/three.miniprogram.js`）创建与 canvas 绑定的 THREE 命名空间；
- `registerGLTFLoader(THREE)`（`lib/gltf-loader.js`）把 three.js r108 的 GLTFLoader 注册进去；
- `new THREE.WebGLRenderer({ antialias: true })` 创建渲染器，DPR 上限 2；
- `canvas.requestAnimationFrame` 驱动主循环。

### 3.2 GLB 加载

`lib/robot-model.js` 是 464 KB GLB 的 base64 内联版本。加载链路：

```text
base64 string
  → wx.base64ToArrayBuffer
  → new THREE.GLTFLoader().parse(buffer, '', onLoad, onError)
  → gltf.scene + gltf.animations
```

这样做的原因：

- 不依赖网络域名白名单；
- 不依赖 `FileSystemManager` 对代码包路径的行为差异；
- 包体积增加约 619 KB base64，但总主包仍 < 2 MB。

### 3.3 模型处理

- 使用 `Box3` 计算包围盒，按目标高度 2.32 缩放，脚底对齐 `y=0`；
- 遍历 mesh：`castShadow`、`frustumCulled=false`，按材质名替换为白/石墨/青色自发光方案；
- 保留蒙皮与 morph target 所需属性；
- 统计骨骼数、三角形数与动画段数，显示在资产面板。

### 3.4 动画与相机

- `AnimationMixer` + `clipAction` 播放 43 骨骼动画；
- `Idle` / `Walking` / `Running` / `Dance` 四个入口，切换时交叉淡入淡出；
- 相机使用球坐标 `theta/phi/radius`，拖动改变角度，双指改变半径；
- 默认关闭自动环绕，避免展示时错过正面；按钮可开启缓慢环绕；
- 舞台包含圆柱展台、Torus 光环、GridHelper、粒子星点、方向光阴影与两盏补光。

### 3.5 性能

- 模型 3,237 三角形，43 骨骼，属于低多边形资产；
- DPR 上限 2，避免高像素密度设备过度绘制；
- 阴影贴图 1024，单方向光；
- 模拟器稳定 60 FPS。

## 4. 状态与交互分层

- 页面负责手势与 `setData`；
- `utils/*` 只放纯函数，便于 Node 冒烟；
- 组件（`demo-card`、`stage-hint`）只通过 `triggerEvent` 与页面通信；
- 所有页面数据更新都走 `setData` 的字段级路径，避免整对象重设。

## 5. 包体与构建

- 无构建步骤、无 npm 依赖；
- `lib/` 中的 Three.js / GLTFLoader / GLB 是源码级 vendor；
- `project.config.json` 的 `packOptions.ignore` 排除 `scripts/`、`tools/`、`docs/`、`.github/` 与文档；
- 主包 1,419.9 KB，包含 49 个文件（校验脚本统计）。

## 6. 安全边界

- 仓库不含真实 AppID、上传密钥或 Token；
- `project.config.json` 使用 `touristappid` 占位；
- 不引入 CDN、不发起网络请求；
- 第三方库与模型许可记录在 `lib/LICENSES.md`。
