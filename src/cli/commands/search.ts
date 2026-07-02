import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind } from '../../core/types.js'

const kindIcons: Record<string, string> = { skill: '📦', mcp: '🔌', command: '⚡', agent: '🤖' }

export function searchCommand(storage: RegistryStorage, query: string, opts: any) {
  const kind = opts.type as ItemKind | undefined
  const results = storage.search(query, kind)

  if (opts.json) return console.log(JSON.stringify(results, null, 2))

  if (results.length === 0) {
    console.log(chalk.yellow(`未找到匹配 "${query}" 的结果`))
    return
  }

  console.log(chalk.cyan(`\n🔎 搜索结果 "${query}" (${results.length})`))
  console.log()
  for (const r of results) {
    const icon = kindIcons[r.kind] || '?'
    const status = r.enabled ? chalk.green('✔') : chalk.dim('✖')
    console.log(`  ${status} ${icon} ${chalk.bold(r.kind)}: ${r.name}`)
    if (r.description) console.log(chalk.dim(`     ${r.description.slice(0, 100)}`))
  }
  console.log()
}
