import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'

export function statsCommand(storage: RegistryStorage, opts: any) {
  const summary = storage.getSummary()

  if (opts.json) return console.log(JSON.stringify(summary, null, 2))

  console.log(chalk.cyan('\n📊 OpenCode 注册中心统计'))
  console.log(chalk.dim(`  DB 路径: ${storage.getDbPath()}`))
  console.log(chalk.dim(`  数据库大小: ${(summary.dbSize / 1024).toFixed(1)} KB`))
  console.log(chalk.dim(`  最后扫描: ${summary.lastScanned}`))
  console.log()

  console.log(chalk.bold('📦 Skills'))
  console.log(`  总计: ${summary.skills.total}`)
  console.log(`  已启用: ${summary.skills.enabled}`)
  console.log(`  分类:`)
  for (const [cat, count] of Object.entries(summary.skills.categories).sort((a, b) => b[1] - a[1])) {
    console.log(chalk.dim(`    ${cat}: ${count}`))
  }
  console.log()

  console.log(chalk.bold('🔌 MCP Servers'))
  console.log(`  总计: ${summary.mcpServers.total}`)
  console.log(`  已启用: ${summary.mcpServers.enabled}`)
  console.log(`  分组:`)
  for (const [g, count] of Object.entries(summary.mcpServers.groups).sort((a, b) => b[1] - a[1])) {
    console.log(chalk.dim(`    ${g}: ${count}`))
  }
  console.log()

  console.log(chalk.bold('⚡ Commands'))
  console.log(`  总计: ${summary.commands.total}`)
  console.log(`  已启用: ${summary.commands.enabled}`)
  for (const [s, count] of Object.entries(summary.commands.scopes).sort()) {
    console.log(chalk.dim(`    ${s}: ${count}`))
  }
  console.log()

  console.log(chalk.bold('🤖 Agents'))
  console.log(`  总计: ${summary.agents.total}`)
  console.log(`  已启用: ${summary.agents.enabled}`)
  console.log()
}
