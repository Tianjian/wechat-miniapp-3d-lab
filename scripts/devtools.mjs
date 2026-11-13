// scripts/devtools.mjs —— 微信开发者工具 CLI 封装（开源仓库版）
// 用法：node scripts/devtools.mjs <open|preview|upload|login> [options]
// 说明：project.config.json 默认使用 touristappid 占位；preview/upload 前请替换为自己的 AppID。
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOME = process.env.USERPROFILE || process.env.HOME || ''
const LOCAL_APPDATA = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local')

const USAGE = `
用法：node scripts/devtools.mjs <command> [options]

命令：
  open      在微信开发者工具中打开本工程（touristappid 时会降级为打开 IDE）
  preview   生成预览二维码（需已登录，且 project.config.json 使用真实 AppID）
  upload    上传体验版（需 --version 与 --desc，且使用真实 AppID）
  login     打开工具登录界面

示例：
  node scripts/devtools.mjs open
  node scripts/devtools.mjs preview
  node scripts/devtools.mjs upload --version 1.0.0 --desc "首个体验版"
`.trim()

const CLI_CANDIDATES = [
  path.join(LOCAL_APPDATA, 'Programs', '微信web开发者工具', 'cli.bat'),
  path.join(LOCAL_APPDATA, 'Programs', '微信开发者工具', 'cli.bat'),
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files (x86)\\Tencent\\微信开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信开发者工具\\cli.bat'
]

function findCli() {
  for (const candidate of CLI_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function readAppId() {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
    return String(config.appid || '').trim()
  } catch {
    return ''
  }
}

function quote(arg) {
  return /[\s"]/.test(arg) ? '"' + String(arg).replace(/"/g, '""') + '"' : String(arg)
}

const args = process.argv.slice(2)
const command = args[0] || 'open'

if (command === '--help' || command === '-h' || command === 'help') {
  console.log(USAGE)
  process.exit(0)
}

if (!['open', 'preview', 'upload', 'login'].includes(command)) {
  console.error('[devtools] 未知命令：' + command)
  console.log(USAGE)
  process.exit(1)
}

const cli = findCli()
if (!cli) {
  console.error('[devtools] 未检测到微信开发者工具 CLI。')
  console.error('          请先安装微信开发者工具，并开启「设置 → 安全设置 → 服务端口」。')
  console.error('          常见安装位置：%LOCALAPPDATA%\\Programs\\微信web开发者工具\\cli.bat')
  process.exit(2)
}

const extra = args.slice(1).filter((arg) => arg !== '--force')
const force = args.includes('--force')
const appid = readAppId()
const tourist = !appid || appid === 'touristappid'

if (command === 'upload' && (!extra.includes('--version') || !extra.includes('--desc'))) {
  console.error('[devtools] upload 需要 --version 与 --desc 参数。')
  process.exit(1)
}

if (!tourist && !/^wx[0-9a-f]{16}$/i.test(appid)) {
  console.error('[devtools] project.config.json 的 appid 格式不正确：' + appid)
  process.exit(1)
}

let projectArgs = ['--project', ROOT]
if (tourist && command !== 'login') {
  if (command !== 'open' || force) {
    console.error('[devtools] 当前 appid 为 "' + (appid || '(空)') + '"，无法 preview/upload。')
    console.error('          请把 project.config.json 的 appid 替换为自己的小程序 AppID，或使用测试号。')
    if (command !== 'open') process.exit(1)
  }
  console.log('[devtools] appid 为游客/空值：本次只打开 IDE；请在 IDE 中导入工程并填写自己的 AppID。')
  projectArgs = []
}

const childEnv = { ...process.env }
delete childEnv.ELECTRON_RUN_AS_NODE

const parts = [cli, command, ...projectArgs, ...extra].map(quote)
const commandLine = '"' + parts.join(' ') + '"'
console.log('[devtools] ' + commandLine)

const result =
  process.platform === 'win32'
    ? spawnSync(process.env.COMSPEC || 'cmd.exe', ['/d', '/s', '/c', commandLine], {
        stdio: 'inherit',
        env: childEnv,
        windowsVerbatimArguments: true
      })
    : spawnSync(cli, [command, ...projectArgs, ...extra], { stdio: 'inherit', env: childEnv })

if (result.error) {
  console.error('[devtools] 启动失败：' + result.error.message)
  process.exit(1)
}
process.exit(result.status == null ? 1 : result.status)
