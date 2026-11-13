# 第三方资产与许可

本目录下的 WebGL 演示使用了以下成熟开源资产 / 库。发布或再分发时请保留本文件。

## three.js r108 / threejs-miniprogram

- **three.js**：Copyright © 2010-2019 three.js authors，MIT License。
- **threejs-miniprogram 0.0.8**：微信小程序 WebGL 适配层，Copyright © 2019 wechat-miniprogram，MIT License。
- 文件：`three.miniprogram.js`
- 来源：<https://github.com/wechat-miniprogram/threejs-miniprogram>

## GLTFLoader（three.js examples）

- 来自 three.js r108 的 `examples/js/loaders/GLTFLoader.js`，并调整为 CommonJS 的 `registerGLTFLoader(THREE)`。
- Copyright © 2010-2019 three.js authors，MIT License。
- 文件：`gltf-loader.js`
- 来源：<https://github.com/mrdoob/three.js/blob/r108/examples/js/loaders/GLTFLoader.js>

## RobotExpressive.glb

- 模型：**Tomás Laulhé**（<https://www.patreon.com/quaternius>）
- 修改：**Don McCurdy**（增加面部 morph target，FBX2glTF 转换，合并材质并降低金属度）
- 许可：**CC0 1.0**（公共领域）
- 文件：`robot-model.js`（GLB 的 base64 内联版本）
- 来源：<https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive>
- 规格：463,988 字节，43 根骨骼，14 段动画（含 Idle / Walking / Running / Dance / Wave 等）

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
