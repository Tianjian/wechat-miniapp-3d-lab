// 3d-lab/scripts/lib/checks.mjs —— 轻量 WXML / WXSS 静态检查
// 只覆盖本项目会用到的语法：标签配对、未知标签、事件绑定、wx:for 的 wx:key、花括号与 @import。

export const KNOWN_TAGS = new Set([
  'view',
  'scroll-view',
  'swiper',
  'swiper-item',
  'cover-view',
  'cover-image',
  'movable-area',
  'movable-view',
  'icon',
  'text',
  'rich-text',
  'progress',
  'button',
  'checkbox',
  'checkbox-group',
  'form',
  'input',
  'label',
  'picker',
  'picker-view',
  'picker-view-column',
  'radio',
  'radio-group',
  'slider',
  'switch',
  'textarea',
  'navigator',
  'image',
  'video',
  'camera',
  'canvas',
  'open-data',
  'web-view',
  'official-account',
  'block',
  'template',
  'import',
  'include',
  'slot',
  'page-meta',
  'navigation-bar',
  'page-container',
  'share-element',
  'match-media',
  'root-portal',
  'keyboard-accessory',
  'editor'
])

function buildLineIndex(source) {
  const starts = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') starts.push(i + 1)
  }
  return function lineAt(offset) {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (starts[mid] <= offset) low = mid
      else high = mid - 1
    }
    return low + 1
  }
}

export function checkWxml(source) {
  const errors = []
  const warnings = []
  const lineAt = buildLineIndex(source)
  const src = source.replace(/<!--[\s\S]*?-->/g, function (match) {
    return match.replace(/[^\n]/g, ' ')
  })

  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|\{\{[\s\S]*?\}\}|[^>"'])*?)(\/?)>/g
  const stack = []
  const tags = new Set()
  const handlers = []
  const unknownTags = []
  const loopsWithoutKey = []

  let match
  while ((match = tagPattern.exec(src)) !== null) {
    const closing = match[1] === '/'
    const name = match[2]
    const attrs = match[3] || ''
    const selfClosing = match[4] === '/'
    const line = lineAt(match.index)

    if (!closing) {
      tags.add(name)
      if (!KNOWN_TAGS.has(name)) unknownTags.push({ name, line })
      if (/\bwx:for\s*=/.test(attrs) && !/\bwx:key\s*=/.test(attrs)) loopsWithoutKey.push(line)
      const bindingPattern = /\b(?:bind|catch|mut-bind|capture-bind|capture-catch)[:]?([a-zA-Z]+)\s*=\s*"([^"]*)"/g
      let binding
      while ((binding = bindingPattern.exec(attrs)) !== null) {
        handlers.push({ line, name: binding[2] })
      }
    }

    if (closing) {
      const top = stack.pop()
      if (!top) errors.push({ line, message: '多余的结束标签 </' + name + '>' })
      else if (top.name !== name) {
        errors.push({
          line,
          message: '标签不匹配：<' + top.name + '>（第 ' + top.line + ' 行）被 </' + name + '> 关闭'
        })
        stack.push(top)
      }
      continue
    }

    if (!selfClosing) stack.push({ name, line })
  }

  stack.forEach(function (entry) {
    errors.push({ line: entry.line, message: '标签未闭合：<' + entry.name + '>' })
  })
  loopsWithoutKey.forEach(function (line) {
    warnings.push({ line, message: 'wx:for 缺少 wx:key' })
  })

  return {
    errors,
    warnings,
    tags: Array.from(tags),
    handlers,
    unknownTags,
    loopsWithoutKey
  }
}

export function collectAssetRefs(source) {
  const refs = []
  const pattern = /\b(?:src|poster|background-image)\s*=\s*"([^"]+)"/g
  let match
  while ((match = pattern.exec(source)) !== null) {
    if (!/\{\{/.test(match[1])) refs.push(match[1])
  }
  return refs
}

export function checkWxss(source) {
  const errors = []
  const imports = []
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, function (match) {
    return match.replace(/[^\n]/g, ' ')
  })

  const importPattern = /@import\s+(?:url\(\s*)?["']([^"']+)["']/g
  let importMatch
  while ((importMatch = importPattern.exec(stripped)) !== null) {
    imports.push(importMatch[1])
  }

  let depth = 0
  let line = 1
  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i]
    if (ch === '\n') line += 1
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth < 0) {
        errors.push({ line, message: '多余的右花括号 }' })
        depth = 0
      }
    }
  }
  if (depth > 0) errors.push({ line, message: '花括号未闭合，缺少 ' + depth + ' 个 }' })

  return { errors, imports }
}
