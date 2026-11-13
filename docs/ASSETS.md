# 3D 资产与第三方许可

## RobotExpressive（人形机器人）

- 名称：RobotExpressive
- 作者：[Tomás Laulhé](https://www.patreon.com/quaternius)
- 修改：[Don McCurdy](https://donmccurdy.com/)
  - 增加面部表情 morph target
  - 使用 FBX2GLTF 转换
  - 合并重复材质、降低金属度
- 许可：**CC0 1.0**（公共领域）
- 来源：[three.js examples/models/gltf/RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive)
- 规格：463,988 字节；43 骨骼；14 段动画；3 个材质（Grey / Main / Black）；无外部贴图
- SHA-256：`047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`

仓库内以 `lib/robot-model.js`（base64）形式存在，解码后即为原始 GLB。重新生成方式：

```js
// Node.js
const fs = require('fs')
const src = 'RobotExpressive.glb'
const base64 = fs.readFileSync(src).toString('base64')
fs.writeFileSync(
  'lib/robot-model.js',
  '// RobotExpressive.glb (CC0 1.0)\nmodule.exports = ' + JSON.stringify(base64) + '\n',
  'utf8'
)
```

## three.js r108 / threejs-miniprogram

- [three.js](https://threejs.org/)：Copyright © 2010-2019 three.js authors，MIT
- [threejs-miniprogram](https://github.com/wechat-miniprogram/threejs-miniprogram) 0.0.8：Copyright © 2019 wechat-miniprogram，MIT
- 文件：`lib/three.miniprogram.js`
- SHA-256：`7a61f16a92e5aad6f371de737c4a33b0076901a48b5ce75e738d451d20f2c2ad`

## GLTFLoader（three.js examples）

- 来源：three.js r108 `examples/js/loaders/GLTFLoader.js`
- 修改：包装为 CommonJS 的 `registerGLTFLoader(THREE)`，供 scoped THREE 使用
- 许可：MIT
- 文件：`lib/gltf-loader.js`
- SHA-256：`716b8ef2c23a80aeafe0c1530cf7f7bf6eac19e80cc88281667205c4cc085044`

## 许可全文

完整 MIT 文本与来源汇总见 [`lib/LICENSES.md`](../lib/LICENSES.md)。

> 修改或再分发时请保留上述版权声明与许可信息。RobotExpressive 为 CC0，不强制署名，但本项目保留作者与修改者信息以示尊重。
