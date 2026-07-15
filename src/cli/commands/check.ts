import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { detectOS, getAgentPaths } from '../../core/platform.js'
import type { AgentType } from '../../core/platform.js'

const ALL_AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

export function checkCommand(storage: RegistryStorage) {
  const osType = detectOS()
  let hasIssues = false

  console.log(chalk.cyan('🔍 运行注册中心检查...\n'))

  const stale = checkStaleEntries(storage)
  if (stale > 0) hasIssues = true

  const dupes = checkDuplicateSkills()
  if (dupes.length > 0) hasIssues = true

  const mcpConflicts = checkMCPConflicts(storage)
  if (mcpConflicts.length > 0) hasIssues = true

  const badMcp = checkBrokenMCPConfigs(storage)
  if (badMcp.length > 0) hasIssues = true

  const drift = checkConfigDrift(storage)
  if (drift.length > 0) hasIssues = true

  checkHermesCompat(storage)

  console.log()
  if (!hasIssues) {
    console.log(chalk.green('✅ 未发现问题'))
  } else {
    console.log(chalk.yellow('⚠  发现问题，建议处理'))
  }
}

function checkStaleEntries(storage: RegistryStorage): number {
  const skills = storage.listSkills()
  let stale = 0
  for (const s of skills) {
    if (!fs.existsSync(s.filePath)) {
      console.log(chalk.red(`  ✖ 失效条目: ${s.name} (文件已删除: ${s.filePath})`))
      stale++
    }
  }
  if (stale === 0) {
    console.log(chalk.green(`  ✔ 技能路径: ${skills.length} 个均有效`))
  }
  return stale
}

function checkDuplicateSkills(): { name: string; paths: string[] }[] {
  const dirs = ALL_AGENTS.map(a => {
    try { return { agent: a, path: getAgentPaths(a).skillDir } }
    catch { return null }
  }).filter(Boolean) as { agent: AgentType; path: string }[]

  const skillMap: Record<string, { agent: AgentType; path: string }[]> = {}

  for (const d of dirs) {
    if (!fs.existsSync(d.path)) continue
    const entries = fs.readdirSync(d.path, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (!fs.existsSync(path.join(d.path, e.name, 'SKILL.md'))) continue
      if (!skillMap[e.name]) skillMap[e.name] = []
      skillMap[e.name].push({ agent: d.agent, path: path.join(d.path, e.name) })
    }
  }

  const dupes = Object.entries(skillMap).filter(([, v]) => v.length > 1)
  if (dupes.length === 0) {
    console.log(chalk.green('  ✔ 跨 Agent 技能: 无重复'))
  } else {
    for (const [name, agents] of dupes) {
      const paths = agents.map(a => `${a.agent}(${a.path})`).join(', ')
      console.log(chalk.yellow(`  ⚠  技能重复: ${name} → ${paths}`))
    }
  }
  return dupes.map(([name, agents]) => ({ name, paths: agents.map(a => a.path) }))
}

function checkMCPConflicts(storage: RegistryStorage): string[] {
  const mcps = storage.listMCPServers()
  const byName: Record<string, string[]> = {}
  const conflictsFound: string[] = []

  for (const m of mcps) {
    const key = m.command
    if (!byName[key]) byName[key] = []
    byName[key].push(m.name)
  }

  const shared = Object.entries(byName).filter(([, v]) => v.length > 1)
  let realConflict = false

  for (const [, names] of shared) {
    const portArgs: string[] = []
    for (const n of names) {
      const m = mcps.find(x => x.name === n)
      if (m) {
        const allArgs = [m.command, ...(m.args || [])]
        const ports = allArgs.filter(a => /^\d{4,5}$/.test(a) && parseInt(a) > 1024)
        portArgs.push(...ports)
      }
    }
    if (portArgs.length > 1 && new Set(portArgs).size < portArgs.length) {
      console.log(chalk.yellow(`  ⚠  端口冲突: ${names.join(', ')} → 端口 ${[...new Set(portArgs)].join(', ')}`))
      realConflict = true
      conflictsFound.push(names.join(', '))
    }
  }

  if (!realConflict) {
    console.log(chalk.green(`  ✔ MCP 服务器: ${mcps.length} 个，无端口冲突`))
  }
  return conflictsFound
}

function checkBrokenMCPConfigs(storage: RegistryStorage): string[] {
  const mcps = storage.listMCPServers()
  const broken: string[] = []
  for (const m of mcps) {
    const cmd = (m.command || '').trim()
    const args = m.args || []
    const launcherOnly = cmd === 'npx' && args.length === 0
    const pythonOnly = (cmd === 'python3' || cmd === 'python') && args.length === 0
    const emptyCmd = !cmd
    const lazyPlaceholder = cmd.includes('lazy-mcp')
    if (emptyCmd || launcherOnly || pythonOnly || lazyPlaceholder) {
      broken.push(m.name)
      console.log(chalk.yellow(`  ⚠  MCP 配置可疑: ${m.name} → command=${cmd || '(empty)'} args=${args.join(' ') || '(none)'}`))
    }
  }
  if (broken.length === 0) {
    console.log(chalk.green('  ✔ MCP 配置形状: 无空 command / launcher-only / lazy placeholder'))
  }
  return broken
}

function checkConfigDrift(storage: RegistryStorage): string[] {
  const mcps = storage.listMCPServers()
  const registryEnabled = new Set(mcps.filter(m => m.enabled).map(m => m.name))
  const drift: string[] = []

  for (const agent of ALL_AGENTS) {
    const paths = getAgentPaths(agent)
    const configFile = paths.configFile
    if (!fs.existsSync(configFile)) continue

    try {
      const raw = fs.readFileSync(configFile, 'utf-8')
      let configEnabled: Set<string>

      if (paths.configFormat === 'toml') {
        configEnabled = new Set()
        if (raw.includes('[')) {
          const lines = raw.split('\n')
          for (const line of lines) {
            const m = line.match(/^\s*"([^"]+)"\s*=\s*\{/)
            if (m) configEnabled.add(m[1])
          }
        }
      } else {
        const parsed = JSON.parse(raw)
        const section = parsed[paths.mcpSection] || {}
        configEnabled = new Set(
          Object.entries(section)
            .filter(([, v]: any) => v.enabled !== false)
            .map(([k]) => k)
        )
      }

      if (configEnabled.size > 0) {
        const inRegNotInConfig = [...registryEnabled].filter(x => !configEnabled.has(x))
        const inConfigNotInReg = [...configEnabled].filter(x => !registryEnabled.has(x))

        if (inRegNotInConfig.length > 0 || inConfigNotInReg.length > 0) {
          drift.push(agent)
        }
      }
    } catch {}
  }

  if (drift.length === 0) {
    console.log(chalk.green(`  ✔ Agent 配置: 与注册中心一致`))
  } else {
    for (const a of drift) {
      console.log(chalk.yellow(`  ⚠  配置漂移: ${a} 与注册中心状态不一致 (运行 oreg sync --agent ${a} 修复)`))
    }
  }
  return drift
}

function checkHermesCompat(storage: RegistryStorage) {
  const hermesSkills = storage.listSkills().filter(s => s.name.includes('hermes') || s.name.includes('hermes-engine'))
  const hermesMcp = storage.listMCPServers().filter(m => m.name.includes('hermes'))

  if (hermesSkills.length > 0 && hermesMcp.length > 0) {
    console.log(chalk.green(`  ✔ Hermes Agent: ${hermesSkills.length} skills + ${hermesMcp.length} MCP 均正常`))
  } else if (hermesMcp.length > 0) {
    console.log(chalk.dim(`  ℹ Hermes MCP 已注册 (${hermesMcp.map(m => m.name).join(', ')})`))
  }
}
