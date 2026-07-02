import chalk from 'chalk'
import { Scanner } from '../../core/scanner.js'

export async function scanCommand(scanner: Scanner) {
  console.log(chalk.cyan('🔍 扫描 OpenCode 配置中...'))
  const result = await scanner.scanAll()
  console.log()
  if (result.errors.length > 0) {
    console.log(chalk.yellow(`⚠  ${result.errors.length} 个错误`))
    for (const err of result.errors.slice(0, 5)) {
      console.log(chalk.dim(`  ${err}`))
    }
  }
  console.log(chalk.green(`✔ 扫描完成 (${result.duration}ms)`))
  console.log(`  新建 ${chalk.bold(String(result.newRecords))} 条`)
  console.log(`  更新 ${chalk.bold(String(result.updatedRecords))} 条`)
  console.log()
  console.log(chalk.cyan('💡 使用 oreg stats 查看统计，oreg list 查看详情'))
}
