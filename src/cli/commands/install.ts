import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { Scanner } from '../../core/scanner.js'
import { detectOS, osName, getAgentPaths, generateAgentConfig } from '../../core/platform.js'
import type { AgentType, OSType } from '../../core/platform.js'

const VALID_AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

export async function installCommand(source: string, opts: any) {
  const dryRun = !!opts.dryRun
  const osType = detectOS()
  const agents: AgentType[] = opts.agent
    ? (opts.agent as string).split(',').map((a: string) => a.trim()).filter((a: string) => VALID_AGENTS.includes(a as AgentType)) as AgentType[]
    : ['opencode']

  if (agents.length === 0) {
    console.log(chalk.red(`✖ 无效 agent。支持: ${VALID_AGENTS.join(', ')}`))
    return
  }

  const manifestPath = path.join(source, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.log(chalk.red(`✖ 未找到 ${manifestPath}，请确保导出目录包含 manifest.json`))
    return
  }

  let manifest: any
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) } catch {
    console.log(chalk.red('✖ manifest.json 解析失败'))
    return
  }

  console.log(chalk.cyan(`📦 安装导出包`))
  console.log(chalk.dim(`  平台: ${osName(osType)}`))
  console.log(chalk.dim(`  Agent: ${agents.join(', ')}`))
  console.log(chalk.dim(`  记录: ${manifest.summary.total} 条`))
  if (dryRun) console.log(chalk.yellow('  [DRY RUN] 仅预览'))
  console.log()

  for (const agent of agents) {
    await installForAgent(agent, source, manifest, osType, dryRun)
  }

  if (dryRun) {
    console.log(chalk.yellow('\n这是预览模式。去掉 --dry-run 执行实际安装。'))
  } else {
    console.log(chalk.green(`\n✅ 安装完成。`))
  }
}

async function installForAgent(agent: AgentType, source: string, manifest: any, osType: OSType, dryRun: boolean) {
  const paths = getAgentPaths(agent, osType)
  console.log(chalk.bold(`\n▸ ${paths.example} (${paths.configDir})`))

  let installed = 0

  const skillsSrc = path.join(source, 'skills')
  if (fs.existsSync(skillsSrc)) {
    if (!dryRun && !fs.existsSync(paths.skillDir)) {
      fs.mkdirSync(paths.skillDir, { recursive: true })
    }

    const categories = fs.readdirSync(skillsSrc)
    let skillCount = 0
    for (const cat of categories) {
      const catDir = path.join(skillsSrc, cat)
      if (!fs.statSync(catDir).isDirectory()) continue
      const names = fs.readdirSync(catDir)
      for (const name of names) {
        const srcDir = path.join(catDir, name)
        if (!fs.statSync(srcDir).isDirectory()) continue
        const destDir = path.join(paths.skillDir, name)

        if (dryRun) {
          const hasRefs = fs.existsSync(path.join(srcDir, 'references'))
          console.log(chalk.dim(`  [dry-run] skill: ${name}${hasRefs ? ' + refs' : ''}`))
          skillCount++
          continue
        }

        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true, force: true })
        }
        fs.cpSync(srcDir, destDir, { recursive: true })
        skillCount++
      }
    }
    if (!dryRun) {
      console.log(chalk.green(`  ✔ ${skillCount} skills → ${paths.skillDir}`))
    }
    installed += skillCount
  }

  const mcpSrc = path.join(source, 'mcp-servers')
  if (fs.existsSync(mcpSrc)) {
    const mcps: { name: string; command: string; args: string[]; env: Record<string, string>; enabled: boolean }[] = []
    const groups = fs.readdirSync(mcpSrc)
    for (const group of groups) {
      const groupDir = path.join(mcpSrc, group)
      if (!fs.statSync(groupDir).isDirectory()) continue
      const files = fs.readdirSync(groupDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(groupDir, file), 'utf-8'))
        mcps.push({
          name: data.name, command: data.command, args: data.args || [],
          env: data.env || {}, enabled: data.enabled !== false,
        })
      }
    }

    if (dryRun) {
      console.log(chalk.dim(`  [dry-run] MCP: ${mcps.length} servers → ${paths.configFile}`))
    } else {
      const configDir = path.dirname(paths.configFile)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      let existing: any = {}
      if (fs.existsSync(paths.configFile)) {
        try {
          if (paths.configFormat === 'toml') {
            existing = {}
          } else {
            existing = JSON.parse(fs.readFileSync(paths.configFile, 'utf-8'))
          }
        } catch {}
      }

      const newConfig = generateAgentConfig(agent, mcps)
      if (paths.configFormat === 'toml') {
        fs.writeFileSync(paths.configFile, newConfig)
      } else {
        const parsed = JSON.parse(newConfig)
        const merged = { ...existing, ...parsed }
        fs.writeFileSync(paths.configFile, JSON.stringify(merged, null, 2))
      }
      console.log(chalk.green(`  ✔ ${mcps.length} MCP servers → ${paths.configFile}`))
    }
    installed += mcps.length
  }

  const dbSrc = path.join(source, 'registry.db')
  if (fs.existsSync(dbSrc) && !dryRun) {
    const dbDest = path.join(paths.configDir, 'registry.db')
    fs.cpSync(dbSrc, dbDest)
    console.log(chalk.green(`  ✔ registry.db → ${dbDest}`))
  }

  if (!dryRun && agent === 'opencode') {
    const storage = new RegistryStorage()
    const scanner = new Scanner(storage, { opencodeConfigPath: paths.configFile })
    const result = await scanner.scanAll()
    storage.close()
  }
}
