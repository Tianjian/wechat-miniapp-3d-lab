// 3d-lab/scripts/verify.mjs —— 3D LAB 工程完整性校验
// 覆盖：环境、工程配置、页面/组件、静态语法、引用一致性、mock 冒烟、包体积。
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { checkWxml, collectAssetRefs, KNOWN_TAGS, checkWxss } from './lib/checks.mjs'
import { runSmoke } from './lib/smoke.mjs'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_CLI = path.join(
  process.env.LOCALAPPDATA || '',
  'Programs',
  '微信web开发者工具',
  'cli.bat'
)

function abs(relativePath) {
  return path.resolve(ROOT, relativePath)
}

function rel(absolutePath) {
  return path.relative(ROOT, absolutePath).split(path.sep).join('/')
}

function exists(relativePath) {
  return fs.existsSync(abs(relativePath))
}

function readText(relativePath) {
  return fs.readFileSync(abs(relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath))
}

const IGNORED = new Set(['node_modules', '.git', 'miniprogram_npm', '.dsh'])

function walk(target, extensions) {
  const start = abs(target)
  const files = []
  function visit(directory) {
    let entries = []
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    })
    entries.forEach(function (entry) {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORED.has(entry.name)) visit(full)
        return
      }
      if (!entry.isFile()) return
      if (extensions && extensions.indexOf(path.extname(entry.name).toLowerCase()) < 0) return
      files.push(full)
    })
  }
  visit(start)
  return files
}

function listDirs(target) {
  try {
    return fs
      .readdirSync(abs(target), { withFileTypes: true })
      .filter(function (entry) {
        return entry.isDirectory()
      })
      .map(function (entry) {
        return entry.name
      })
      .sort()
  } catch {
    return []
  }
}

function normalizePagePath(url) {
  return String(url || '')
    .split('?')[0]
    .replace(/^\.?\//, '')
}

function resolveReference(fromRelative, target) {
  if (target.startsWith('/')) return target.slice(1)
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRelative), target))
}

function collectFunctionNames(source) {
  const names = new Set()
  const patterns = [
    /([A-Za-z_$][\w$]*)\s*\(/g,
    /([A-Za-z_$][\w$]*)\s*:\s*function\b/g,
    /([A-Za-z_$][\w$]*)\s*:\s*\(/g
  ]
  patterns.forEach(function (pattern) {
    let match
    while ((match = pattern.exec(source)) !== null) names.add(match[1])
  })
  return names
}

/* ------------------------------ 报告 ------------------------------ */

const sections = []
let current = null

function section(title) {
  current = { title, items: [] }
  sections.push(current)
}

function add(status, name, detail) {
  if (!current) section('常规')
  current.items.push({ status, name, detail: detail || '' })
}

function pass(name, detail) {
  add('pass', name, detail)
}

function warn(name, detail) {
  add('warn', name, detail)
}

function fail(name, detail) {
  add('fail', name, detail)
}

function joinProblems(problems, limit) {
  const shown = problems.slice(0, limit || 12)
  const rest = problems.length - shown.length
  return shown.join('\n') + (rest > 0 ? '\n… 另有 ' + rest + ' 项' : '')
}

/* ------------------------------ 主体 ------------------------------ */

async function main() {
  section('环境')

  const nodeMajor = Number(process.versions.node.split('.')[0])
  if (nodeMajor >= 18) pass('Node 运行时', 'v' + process.versions.node)
  else fail('Node 运行时', '需要 v18 及以上，当前 v' + process.versions.node)

  if (fs.existsSync(PROJECT_CLI)) pass('微信开发者工具 CLI', PROJECT_CLI)
  else warn('未检测到微信开发者工具', '仅影响打开/预览，静态校验与冒烟不受影响')

  /* ------------------------------ 工程配置 ------------------------------ */

  section('工程配置')

  let appJson = null
  try {
    appJson = readJson('app.json')
    pass('app.json 可解析')
  } catch (error) {
    fail('app.json 可解析', error.message)
  }

  const pages = appJson && Array.isArray(appJson.pages) ? appJson.pages : []
  if (!appJson) {
    fail('app.json 缺失', '后续依赖页面清单的检查会跳过')
  } else {
    const problems = []
    if (!pages.length) problems.push('pages 为空')
    if (new Set(pages).size !== pages.length) problems.push('pages 存在重复项')
    if (pages[0] !== 'pages/index/index') problems.push('首个页面不是 pages/index/index')
    if (!appJson.window || typeof appJson.window !== 'object') problems.push('缺少 window 配置')
    if (appJson.renderer !== 'webview') {
      problems.push('renderer 应为 webview（Skyline 对 CSS 3D 支持不完整）')
    }
    if (problems.length) fail('app.json 基础字段', joinProblems(problems))
    else pass('app.json 基础字段', pages.length + ' 个页面 · webview 渲染')
  }

  let projectConfig = null
  try {
    projectConfig = readJson('project.config.json')
    const problems = []
    if (projectConfig.compileType !== 'miniprogram') {
      problems.push('compileType 应为 miniprogram')
    }
    const appid = String(projectConfig.appid || '').trim()
    const tourist = appid === 'touristappid'
    if (!appid) {
      problems.push('缺少 appid（开源仓库可使用 touristappid 占位）')
    } else if (!tourist && !/^wx[0-9a-f]{16}$/i.test(appid)) {
      problems.push('appid 格式应为 wx + 16 位十六进制，或使用 touristappid 占位')
    }
    if (!projectConfig.libVersion) problems.push('缺少 libVersion')
    if (projectConfig.miniprogramRoot) problems.push('miniprogramRoot 应为空')
    if (projectConfig.setting && projectConfig.setting.es6 === false) {
      problems.push('setting.es6 为 false，async/await 无法编译')
    }
    if (problems.length) fail('project.config.json', joinProblems(problems))
    else {
      pass(
        'project.config.json',
        '基础库 ' + projectConfig.libVersion + (tourist ? ' · touristappid（预览前替换）' : ' · ' + appid)
      )
    }
  } catch (error) {
    fail('project.config.json 可解析', error.message)
  }

  try {
    const sitemap = readJson('sitemap.json')
    if (!Array.isArray(sitemap.rules) || !sitemap.rules.length) {
      fail('sitemap.json 规则', 'rules 不能为空')
    } else {
      const bad = sitemap.rules.filter(function (rule) {
        return !rule || (rule.action !== 'allow' && rule.action !== 'disallow') || !rule.page
      })
      if (bad.length) fail('sitemap.json 规则', '存在不完整规则')
      else pass('sitemap.json 规则', sitemap.rules.length + ' 条')
    }
  } catch (error) {
    fail('sitemap.json 可解析', error.message)
  }

  if (exists('README.md')) pass('README.md', readText('README.md').length + ' 字符')
  else warn('README.md 缺失', '建议补充运行与交互说明')

  /* ------------------------------ 页面与组件 ------------------------------ */

  section('页面与组件')

  const componentDirs = listDirs('components')
  const declared = new Map()

  if (!pages.length) {
    fail('页面清单为空')
  } else {
    const problems = []
    pages.forEach(function (page) {
      ;['.js', '.json', '.wxml', '.wxss'].forEach(function (extension) {
        if (!exists(page + extension)) problems.push('缺少 ' + page + extension)
      })
    })
    if (problems.length) fail('页面四件套', joinProblems(problems))
    else pass('页面四件套', pages.length + ' 个页面 × 4 个文件')
  }

  pages.forEach(function (page) {
    const jsonPath = page + '.json'
    if (!exists(jsonPath)) return
    try {
      const config = readJson(jsonPath)
      if (!config.navigationBarTitleText) fail('页面标题', page + '.json 缺少 navigationBarTitleText')
      const using = config.usingComponents || {}
      declared.set(page, Object.keys(using))
      Object.keys(using).forEach(function (name) {
        if (!/^[a-z][a-z0-9-]*$/.test(name)) fail('组件名', page + ' 中的 ' + name + ' 不合法')
        const resolved = resolveReference(page, using[name])
        if (!exists(resolved + '.json')) {
          fail('组件引用', page + ' → ' + using[name] + ' 不存在')
          return
        }
        try {
          if (readJson(resolved + '.json').component !== true) {
            fail('组件声明', resolved + '.json 缺少 "component": true')
          }
        } catch (error) {
          fail('组件配置', resolved + '.json 解析失败：' + error.message)
        }
        ;['.js', '.wxml', '.wxss'].forEach(function (extension) {
          if (!exists(resolved + extension)) fail('组件文件', '缺少 ' + resolved + extension)
        })
      })
    } catch (error) {
      fail('页面配置', jsonPath + ' 解析失败：' + error.message)
    }
  })

  if (componentDirs.length) {
    const problems = []
    componentDirs.forEach(function (dir) {
      const base = 'components/' + dir + '/' + dir
      ;['.js', '.json', '.wxml', '.wxss'].forEach(function (extension) {
        if (!exists(base + extension)) problems.push('缺少 ' + base + extension)
      })
      if (!exists(base + '.json')) return
      try {
        const config = readJson(base + '.json')
        if (config.component !== true) problems.push(base + '.json 缺少 "component": true')
        declared.set(base, Object.keys(config.usingComponents || {}))
      } catch (error) {
        problems.push(base + '.json 解析失败：' + error.message)
      }
    })
    if (problems.length) fail('自定义组件', joinProblems(problems))
    else pass('自定义组件', componentDirs.length + ' 个组件结构完整')
  } else {
    fail('自定义组件', 'components 下没有组件')
  }

  const referencedComponents = new Set()
  pages.forEach(function (page) {
    try {
      const using = readJson(page + '.json').usingComponents || {}
      Object.values(using).forEach(function (target) {
        referencedComponents.add(target.startsWith('/') ? target.slice(1) : target)
      })
    } catch {
      /* 忽略，前面已报告 */
    }
  })
  const unused = componentDirs.filter(function (dir) {
    return !referencedComponents.has('components/' + dir + '/' + dir)
  })
  if (unused.length) warn('未被引用的组件', unused.join('、'))
  else pass('组件引用完整')

  /* ------------------------------ 静态检查 ------------------------------ */

  section('代码静态检查')

  const jsFiles = [abs('app.js')]
    .filter(function (file) {
      return fs.existsSync(file)
    })
    .concat(walk('pages', ['.js']))
    .concat(walk('components', ['.js']))
    .concat(walk('utils', ['.js']))
    .concat(walk('lib', ['.js']))

  const syntaxProblems = []
  jsFiles.forEach(function (file) {
    try {
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel(file) })
    } catch (error) {
      syntaxProblems.push(rel(file) + '：' + error.message)
    }
  })
  if (syntaxProblems.length) fail('JavaScript 语法', joinProblems(syntaxProblems))
  else pass('JavaScript 语法', jsFiles.length + ' 个文件通过解析')

  const jsonFiles = [abs('app.json'), abs('project.config.json'), abs('sitemap.json')]
    .concat(walk('pages', ['.json']))
    .concat(walk('components', ['.json']))
  const jsonProblems = []
  jsonFiles.forEach(function (file) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
      jsonProblems.push(rel(file) + '：' + error.message)
    }
  })
  if (jsonProblems.length) fail('JSON 格式', joinProblems(jsonProblems))
  else pass('JSON 格式', jsonFiles.length + ' 个文件')

  const wxmlFiles = walk('pages', ['.wxml']).concat(walk('components', ['.wxml']))
  const wxmlErrors = []
  const unknownProblems = []
  const handlerProblems = []
  const keyWarnings = []

  wxmlFiles.forEach(function (file) {
    const relativePath = rel(file)
    const source = fs.readFileSync(file, 'utf8')
    const base = relativePath.replace(/\.wxml$/, '')
    const result = checkWxml(source)

    result.errors.forEach(function (error) {
      wxmlErrors.push(relativePath + ':' + error.line + ' ' + error.message)
    })
    result.warnings.forEach(function (warning) {
      keyWarnings.push(relativePath + ':' + warning.line + ' ' + warning.message)
    })

    const allowed = new Set(KNOWN_TAGS)
    ;(declared.get(base) || []).forEach(function (name) {
      allowed.add(name)
    })
    result.unknownTags.forEach(function (tag) {
      if (!allowed.has(tag.name)) {
        unknownProblems.push(relativePath + ':' + tag.line + ' 未声明的标签 <' + tag.name + '>')
      }
    })

    const jsPath = base + '.js'
    if (exists(jsPath) && result.handlers.length) {
      const defined = collectFunctionNames(readText(jsPath))
      result.handlers.forEach(function (handler) {
        if (!defined.has(handler.name)) {
          handlerProblems.push(relativePath + ':' + handler.line + ' 事件处理函数不存在：' + handler.name)
        }
      })
    }
  })

  if (wxmlErrors.length) fail('WXML 标签配对', joinProblems(wxmlErrors))
  else pass('WXML 标签配对', wxmlFiles.length + ' 个文件')
  if (unknownProblems.length) fail('WXML 标签声明', joinProblems(unknownProblems))
  else pass('WXML 标签声明')
  if (handlerProblems.length) fail('WXML 事件绑定', joinProblems(handlerProblems))
  else pass('WXML 事件绑定', '均能在对应 JS 中找到')
  if (keyWarnings.length) warn('WXML wx:for 缺少 wx:key', joinProblems(keyWarnings, 6))
  else pass('WXML wx:for 均带 wx:key')

  const wxssFiles = [abs('app.wxss')]
    .filter(function (file) {
      return fs.existsSync(file)
    })
    .concat(walk('pages', ['.wxss']))
    .concat(walk('components', ['.wxss']))

  const wxssProblems = []
  wxssFiles.forEach(function (file) {
    const relativePath = rel(file)
    const result = checkWxss(fs.readFileSync(file, 'utf8'))
    result.errors.forEach(function (error) {
      wxssProblems.push(relativePath + ':' + error.line + ' ' + error.message)
    })
    result.imports.forEach(function (importPath) {
      if (/^(https?:)?\/\//.test(importPath)) return
      const target = importPath.startsWith('/')
        ? abs(importPath.slice(1))
        : path.resolve(path.dirname(file), importPath)
      if (!fs.existsSync(target)) wxssProblems.push(relativePath + ' @import 目标不存在：' + importPath)
    })
  })
  if (wxssProblems.length) fail('WXSS 语法与引用', joinProblems(wxssProblems))
  else pass('WXSS 语法与引用', wxssFiles.length + ' 个文件')

  /* ------------------------------ 引用一致性 ------------------------------ */

  section('引用一致性')

  const pageSet = new Set(pages)
  const navProblems = []

  jsFiles.forEach(function (file) {
    const relativePath = rel(file)
    const source = fs.readFileSync(file, 'utf8')
    const pattern = /wx\.(navigateTo|redirectTo|switchTab|reLaunch)\s*\(\s*\{[\s\S]{0,240}?url\s*:\s*['"]([^'"]+)['"]/g
    let match
    while ((match = pattern.exec(source)) !== null) {
      const method = match[1]
      const target = normalizePagePath(match[2])
      if (!pageSet.has(target)) {
        navProblems.push(relativePath + ' ' + method + ' 目标未注册：' + match[2])
      }
      if (method === 'switchTab') {
        navProblems.push(relativePath + ' 未配置 tabBar，不能使用 switchTab')
      }
    }
  })

  try {
    const content = require(abs('utils/content.js'))
    content.DEMOS.forEach(function (demo) {
      if (!pageSet.has(normalizePagePath(demo.path))) {
        navProblems.push('utils/content.js 中的演示路径未注册：' + demo.path)
      }
    })
  } catch (error) {
    navProblems.push('utils/content.js 载入失败：' + error.message)
  }

  if (navProblems.length) fail('页面跳转目标', joinProblems(navProblems))
  else pass('页面跳转目标', '静态 URL 与演示数据路径均有效')

  const assetProblems = []
  let assetCount = 0
  wxmlFiles.forEach(function (file) {
    const relativePath = rel(file)
    collectAssetRefs(fs.readFileSync(file, 'utf8')).forEach(function (reference) {
      if (/^(https?:)?\/\//.test(reference) || /^data:/.test(reference)) return
      assetCount += 1
      const target = reference.startsWith('/')
        ? reference.slice(1)
        : path.posix.join(path.posix.dirname(relativePath), reference)
      if (!exists(target)) assetProblems.push(relativePath + ' 引用的资源不存在：' + reference)
    })
  })
  wxssFiles.forEach(function (file) {
    const relativePath = rel(file)
    const source = fs.readFileSync(file, 'utf8')
    const pattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g
    let match
    while ((match = pattern.exec(source)) !== null) {
      const reference = match[1].trim()
      if (!reference || /^(https?:)?\/\//.test(reference) || /^data:/.test(reference)) continue
      assetCount += 1
      const target = reference.startsWith('/')
        ? reference.slice(1)
        : path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), reference))
      if (!exists(target)) assetProblems.push(relativePath + ' 引用的资源不存在：' + reference)
    }
  })
  if (assetProblems.length) fail('静态资源引用', joinProblems(assetProblems))
  else pass('静态资源引用', assetCount + ' 处')

  const requireProblems = []
  jsFiles.forEach(function (file) {
    const relativePath = rel(file)
    const source = fs.readFileSync(file, 'utf8')
    const pattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g
    let match
    while ((match = pattern.exec(source)) !== null) {
      const request = match[1]
      if (!request.startsWith('.') && !request.startsWith('/')) continue
      const target = resolveReference(relativePath, request)
      if (!exists(target + '.js') && !exists(target) && !exists(target + '/index.js')) {
        requireProblems.push(relativePath + ' require 目标不存在：' + request)
      }
    }
  })
  if (requireProblems.length) fail('模块 require 路径', joinProblems(requireProblems))
  else pass('模块 require 路径')

  /* ------------------------------ 冒烟测试 ------------------------------ */

  section('冒烟测试')
  const smoke = await runSmoke({ log: function () {} })
  if (smoke.ok) pass('mock 运行时冒烟', smoke.total + ' 项通过')
  else {
    fail(
      'mock 运行时冒烟',
      smoke.failed
        .map(function (item) {
          return item.name + '：' + item.message
        })
        .join('\n')
    )
  }

  /* ------------------------------ 包体积 ------------------------------ */

  section('包体积')
  const packageFiles = [abs('app.js'), abs('app.json'), abs('app.wxss'), abs('sitemap.json')]
    .filter(function (file) {
      return fs.existsSync(file)
    })
    .concat(walk('pages'))
    .concat(walk('components'))
    .concat(walk('utils'))
    .concat(walk('lib'))
  const totalBytes = packageFiles.reduce(function (sum, file) {
    return sum + fs.statSync(file).size
  }, 0)
  const totalKb = (totalBytes / 1024).toFixed(1)
  if (totalBytes > 2 * 1024 * 1024) fail('主包体积', totalKb + ' KB，超过 2MB')
  else pass('主包体积', totalKb + ' KB / 2048 KB · ' + packageFiles.length + ' 个文件')
}

try {
  await main()
} catch (error) {
  fail('校验脚本异常', (error && error.stack) || String(error))
}

/* ------------------------------ 输出与汇总 ------------------------------ */

console.log('\n3D LAB · 工程自检\n')

const counts = { pass: 0, warn: 0, fail: 0 }
sections.forEach(function (group) {
  console.log('[' + group.title + ']')
  group.items.forEach(function (item) {
    counts[item.status] += 1
    const symbol = item.status === 'pass' ? '✓' : item.status === 'warn' ? '!' : '✗'
    console.log('  ' + symbol + ' ' + item.name + (item.detail ? '  ' + item.detail.replace(/\n/g, '\n      ') : ''))
  })
  console.log('')
})

console.log(
  '汇总：' +
    counts.pass +
    ' 通过 · ' +
    counts.warn +
    ' 警告 · ' +
    counts.fail +
    ' 失败'
)

process.exitCode = counts.fail > 0 ? 1 : 0
