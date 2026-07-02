import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind, RegistryRecord, PackageManifest } from '../../core/types.js'

export async function exportCommand(storage: RegistryStorage, opts: any) {
  const types = (opts.types as string).split(',').map(t => t.trim()) as ItemKind[]
  const output = opts.output as string

  console.log(chalk.cyan(`📤 导出 ${types.join(', ')}...`))

  const records: RegistryRecord[] = []
  for (const t of types) {
    switch (t) {
      case 'skill': records.push(...storage.listSkills()); break
      case 'mcp': records.push(...storage.listMCPServers()); break
      case 'command': records.push(...storage.listCommands()); break
      case 'agent': records.push(...storage.listAgents()); break
    }
  }

  const exportJson = {
    formatVersion: '1.0',
    exportedAt: new Date().toISOString(),
    tool: 'opencode-registry',
    summary: { total: records.length, types: Object.fromEntries(types.map(t => [t, records.filter(r => r.kind === t).length])) },
    records,
    mcpGroups: {
      core: records.filter(r => r.kind === 'mcp' && (r as any).groups?.includes('core')).map(r => r.name),
      automation: records.filter(r => r.kind === 'mcp' && (r as any).groups?.includes('automation')).map(r => r.name),
      devops: records.filter(r => r.kind === 'mcp' && (r as any).groups?.includes('devops')).map(r => r.name),
    }
  }

  fs.writeFileSync(output, JSON.stringify(exportJson, null, 2))
  console.log(chalk.green(`✔ 已导出 ${records.length} 条记录到 ${output}`))
}
