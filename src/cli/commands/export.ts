import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind, RegistryRecord } from '../../core/types.js'

export async function exportCommand(storage: RegistryStorage, opts: any) {
  const types = (opts.types as string).split(',').map((t: string) => t.trim()) as ItemKind[]
  const output = opts.output as string
  const format = opts.format || 'dir'

  if (format === 'json') {
    await exportJSON(storage, types, output)
  } else {
    await exportDir(storage, types, output, format === 'zip')
  }
}

async function exportJSON(storage: RegistryStorage, types: ItemKind[], output: string) {
  const records = collectRecords(storage, types)
  const pkg = buildManifest(records, types)
  fs.writeFileSync(output, JSON.stringify(pkg, null, 2))
  console.log(chalk.green(`✔ 已导出 ${records.length} 条记录到 ${output}`))
}

function collectRecords(storage: RegistryStorage, types: ItemKind[]): RegistryRecord[] {
  const records: RegistryRecord[] = []
  for (const t of types) {
    switch (t) {
      case 'skill': records.push(...storage.listSkills()); break
      case 'mcp': records.push(...storage.listMCPServers()); break
      case 'command': records.push(...storage.listCommands()); break
      case 'agent': records.push(...storage.listAgents()); break
    }
  }
  return records
}

function buildManifest(records: RegistryRecord[], types: ItemKind[]) {
  return {
    formatVersion: '1.0',
    exportedAt: new Date().toISOString(),
    tool: 'opencode-registry',
    summary: {
      total: records.length,
      types: Object.fromEntries(types.map(t => [t, records.filter((r: RegistryRecord) => r.kind === t).length]))
    },
    records,
  }
}

async function exportDir(storage: RegistryStorage, types: ItemKind[], output: string, asZip: boolean) {
  const outDir = asZip ? output.replace(/\.zip$/i, '') : output
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true })
  }

  const records = collectRecords(storage, types)
  let skillCount = 0, mcpCount = 0, cmdCount = 0, agentCount = 0

  for (const r of records) {
    if (r.kind !== 'skill') continue
    const skill = r as any
    const cat = skill.category || 'uncategorized'
    const skillDir = path.join(outDir, 'skills', cat, skill.name)
    fs.mkdirSync(skillDir, { recursive: true })

    const srcPath = skill.filePath
    if (srcPath && fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, path.join(skillDir, 'SKILL.md'), { recursive: true, errorOnExist: false })

      const refDir = path.join(path.dirname(srcPath), 'references')
      if (fs.existsSync(refDir)) {
        const destRef = path.join(skillDir, 'references')
        fs.cpSync(refDir, destRef, { recursive: true, errorOnExist: false })
      }

      const scriptsDir = path.join(path.dirname(srcPath), 'scripts')
      if (fs.existsSync(scriptsDir)) {
        const destScripts = path.join(skillDir, 'scripts')
        fs.cpSync(scriptsDir, destScripts, { recursive: true, errorOnExist: false })
      }
    }
    skillCount++
  }

  for (const r of records) {
    if (r.kind !== 'mcp') continue
    const mcp = r as any
    const groupDir = mcp.groups?.length > 0 ? mcp.groups[0] : 'ungrouped'
    const mcpDir = path.join(outDir, 'mcp-servers', groupDir)
    fs.mkdirSync(mcpDir, { recursive: true })

    const envSummary: Record<string, string> = {}
    for (const k of Object.keys(mcp.env || {})) {
      envSummary[k] = '***'
    }

    const config = {
      name: mcp.name, command: mcp.command, args: mcp.args,
      transport: mcp.transport, lazyLoad: mcp.lazyLoad,
      source: mcp.source, enabled: mcp.enabled,
      env: Object.keys(envSummary).length > 0 ? envSummary : undefined,
    }
    fs.writeFileSync(path.join(mcpDir, `${mcp.name}.json`), JSON.stringify(config, null, 2))
    mcpCount++
  }

  if (types.includes('command')) {
    const cmdDir = path.join(outDir, 'commands')
    fs.mkdirSync(cmdDir, { recursive: true })
    for (const r of records) {
      if (r.kind !== 'command') continue
      const c = r as any
      fs.writeFileSync(path.join(cmdDir, `${c.name}.json`), JSON.stringify({
        name: c.name, description: c.description, scope: c.scope,
        templateLength: c.templateLength, enabled: c.enabled, tags: c.tags
      }, null, 2))
      cmdCount++
    }
  }

  if (types.includes('agent')) {
    const agentDir = path.join(outDir, 'agents')
    fs.mkdirSync(agentDir, { recursive: true })
    for (const r of records) {
      if (r.kind !== 'agent') continue
      const a = r as any
      fs.writeFileSync(path.join(agentDir, `${a.name}.json`), JSON.stringify({
        name: a.name, description: a.description, model: a.model,
        skills: a.skills, mcpServers: a.mcpServers, enabled: a.enabled
      }, null, 2))
      agentCount++
    }
  }

  const manifest = buildManifest(records, types)
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const dbPath = storage.getDbPath()
  if (fs.existsSync(dbPath)) {
    fs.cpSync(dbPath, path.join(outDir, 'registry.db'))
  }

  const summary = [
    `📦 导出目录: ${outDir}`,
    `  skills/       ${skillCount} 个 (按分类: ${groupBy(records.filter(r => r.kind === 'skill'), 'category').join(', ')})`,
    `  mcp-servers/  ${mcpCount} 个 (按分组: ${groupBy(records.filter(r => r.kind === 'mcp'), (r: any) => r.groups?.[0] || 'ungrouped').join(', ')})`,
    `  commands/     ${cmdCount} 个`,
    `  agents/       ${agentCount} 个`,
    `  manifest.json (${JSON.stringify(manifest).length} bytes)`,
    `  registry.db   (${(fs.existsSync(path.join(outDir, 'registry.db')) ? fs.statSync(path.join(outDir, 'registry.db')).size : 0) / 1024} KB)`,
  ].join('\n')

  if (asZip) {
    const { execSync } = await import('child_process')
    try {
      execSync(`cd "${path.dirname(outDir)}" && zip -r "${path.basename(output)}" "${path.basename(outDir)}"`, { stdio: 'pipe' })
      fs.rmSync(outDir, { recursive: true, force: true })
      console.log(chalk.green(`✔ 已导出 ZIP 包: ${output} (${fs.statSync(output).size / 1024} KB)`))
    } catch {
      console.log(chalk.yellow('⚠  ZIP 打包失败（需要安装 zip），保留目录格式'))
      console.log(summary)
    }
    return
  }

  console.log(chalk.green(summary))
}

function groupBy(items: any[], key: string | ((r: any) => string)): string[] {
  const seen = new Set<string>()
  for (const r of items) {
    const k = typeof key === 'function' ? key(r) : r[key]
    if (k) seen.add(k)
  }
  return [...seen].sort()
}
