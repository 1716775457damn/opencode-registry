import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { detectOS, getAgentPaths, generateAgentConfig } from '../../core/platform.js'
import type { AgentType } from '../../core/platform.js'

const VALID_AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

export function syncCommand(storage: RegistryStorage, opts: any) {
  const osType = detectOS()
  const agents: AgentType[] = opts.agent
    ? (opts.agent as string).split(',').map((a: string) => a.trim()).filter((a: string) => VALID_AGENTS.includes(a as AgentType)) as AgentType[]
    : ['opencode']

  console.log(chalk.cyan(`🔄 同步到 ${agents.join(', ')}`))
  console.log()

  const mcps = storage.listMCPServers().map(m => ({
    name: m.name, command: m.command, args: m.args,
    env: m.env, enabled: m.enabled
  }))

  for (const agent of agents) {
    const paths = getAgentPaths(agent, osType)
    const configDir = path.dirname(paths.configFile)

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    const config = generateAgentConfig(agent, mcps)
    const mcpCount = mcps.filter(m => m.enabled).length

    if (paths.configFormat === 'toml') {
      fs.writeFileSync(paths.configFile, config)
    } else {
      let existing: any = {}
      if (fs.existsSync(paths.configFile)) {
        try { existing = JSON.parse(fs.readFileSync(paths.configFile, 'utf-8')) } catch {}
      }
      const parsed = JSON.parse(config)
      const merged = { ...existing, ...parsed }
      fs.writeFileSync(paths.configFile, JSON.stringify(merged, null, 2))
    }

    console.log(chalk.green(`  ✔ ${paths.example}: ${mcpCount} MCP → ${paths.configFile}`))
  }

  console.log(chalk.green(`\n✔ 同步完成`))
}
