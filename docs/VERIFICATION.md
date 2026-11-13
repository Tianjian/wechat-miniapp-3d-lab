# 验证记录

## 环境

| 项目 | 值 |
| --- | --- |
| 系统 | Windows 11 |
| Node.js | v24.21.0 |
| 微信开发者工具 | 2.02.2608080 |
| 基础库（模拟器） | 3.17.6 |
| 日期 | 2026-11-13 |

## 命令

```powershell
# Windows
.\tools\verify.cmd
.\tools\smoke.cmd

# 跨平台
node scripts/verify.mjs
node scripts/smoke.mjs
```

## 结果

| 项目 | 结果 |
| --- | --- |
| 静态校验 | 22 通过 · 0 警告 · 0 失败 |
| mock 冒烟 | 15 / 15 |
| `cli preview`（本地真实 AppID） | 1.3 MB（1,367,996 bytes），无编译错误 |
| 主包体积（校验脚本） | 1,419.8 KB / 2,048 KB |
| 页面 | 7 个（首页 + 6 个实验） |
| 模拟器 | 7 个页面均正常渲染；人形机器人 60 FPS |

### 静态校验覆盖

1. 环境：Node ≥ 18、微信开发者工具 CLI（缺失仅警告）
2. 工程配置：`app.json` 页面与 renderer、`project.config.json`、`sitemap.json`
3. 页面与组件：四件套、`usingComponents` 解析、`component: true`
4. 静态检查：JS 语法（`vm.Script`）、JSON、WXML 标签配对/事件函数、WXSS 花括号与 `@import`
5. 引用一致性：跳转、演示数据路径、资源、`require`
6. 冒烟：App、工具函数、6 个页面、2 个组件、GLB magic/版本
7. 包体积：含 `lib/` < 2 MB

### 人工截图验证

- 首页：6 个实验入口
- 旋转立方体：拖拽角度、面片说明、读数为 `-18° / 28°`
- 全息倾斜卡：正面卡面、翻转按钮、高光
- 景深轮播：5 张 Coverflow、侧卡可见
- 视差星域：4 层景深、HUD、重置
- 四轴机械臂：J1–J4、预设、夹爪、正运动学读数
- 人形机器人：43 骨骼、14 clips、3,237 tris、60 FPS、Walking 动作

## CI

`.github/workflows/verify.yml` 在 Ubuntu + Node 20 上执行 `node scripts/verify.mjs`。 CI 不包含微信开发者工具，因此“开发者工具 CLI”一项为警告而非失败；渲染验证仍需本地 IDE/真机。

## 边界

- mock 冒烟覆盖逻辑层，不覆盖 WebGL 渲染；
- 人形机器人的 60 FPS 为开发者工具模拟器数据，真机性能需另行确认；
- `touristappid` 下无法执行 `preview` / `upload`，CI 也不上传小程序代码。
