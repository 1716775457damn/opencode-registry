import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { buildAIContext, writeAIContextFile } from '../../core/ai-context.js'
import type { ItemKind } from '../../core/types.js'

export function aiContextCommand(storage: RegistryStorage, opts: any) {
  const context = buildAIContext(storage, {
    query: opts.query,
    kind: opts.type as ItemKind | undefined,
    limit: opts.limit ? Number(opts.limit) : undefined,
    includeRecords: opts.records !== false,
  })

  if (opts.output) {
    const { output } = writeAIContextFile(storage, opts.output, {
      query: opts.query,
      kind: opts.type as ItemKind | undefined,
      limit: opts.limit ? Number(opts.limit) : undefined,
      includeRecords: opts.records !== false,
    })
    console.log(chalk.green(`✔ AI context exported: ${output}`))
    return
  }

  if (opts.json) {
    console.log(JSON.stringify(context, null, 2))
    return
  }

  console.log(chalk.cyan('\n🤖 AI Context'))
  console.log(chalk.dim(`  Registry: ${context.registry.root}`))
  console.log(chalk.dim(`  DB: ${context.registry.dbPath}`))
  console.log(chalk.dim(`  Last scanned: ${context.registry.lastScanned}`))
  console.log()
  console.log(`  Skills: ${context.counts.skills.enabled}/${context.counts.skills.total}`)
  console.log(`  MCP:    ${context.counts.mcpServers.enabled}/${context.counts.mcpServers.total}`)
  console.log(`  Cmds:   ${context.counts.commands.enabled}/${context.counts.commands.total}`)
  console.log(`  Agents: ${context.counts.agents.enabled}/${context.counts.agents.total}`)
  console.log()
  if (context.records.length > 0) {
    console.log(chalk.bold('  Top records:'))
    for (const r of context.records.slice(0, 12)) {
      console.log(`    - ${r.kind}: ${r.name}${r.description ? ` — ${String(r.description).slice(0, 90)}` : ''}`)
    }
  }
  console.log()
  console.log(chalk.dim('  Use --json for machine-readable output or -o ai-context.json for file export.'))
}
