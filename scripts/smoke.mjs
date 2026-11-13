// scripts/smoke.mjs —— 只跑 mock 运行时冒烟
import { runSmoke } from './lib/smoke.mjs'

const result = await runSmoke({ log: (...args) => console.log(...args) })

console.log('')
if (!result.ok) {
  console.log('✗ 冒烟测试失败：' + result.failed.length + ' / ' + result.total + ' 项未通过')
  result.failed.forEach((item) => console.log('   - ' + item.name + '：' + item.message))
  process.exitCode = 1
} else {
  console.log('SMOKE OK · ' + result.total + ' 项全部通过')
}
