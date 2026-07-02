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
  const useLink = !!opts.link

  console.log(chalk.cyan(`🔄 同步到 ${agents.join(', ')}`))
  if (useLink) console.log(chalk.dim('  模式: symlink 共享（技能仅存一份）'))
  console.log()

  const mcps = storage.listMCPServers().map(m => ({
    name: m.name, command: m.command, args: m.args,
    env: m.env, enabled: m.enabled
  }))

  const sourceAgent = 'opencode'
  const sourcePaths = getAgentPaths(sourceAgent, osType)

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

    if (useLink && agent !== sourceAgent && fs.existsSync(sourcePaths.skillDir)) {
      const targetDir = paths.skillDir
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

      let linked = 0
      const skills = fs.readdirSync(sourcePaths.skillDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && fs.existsSync(path.join(sourcePaths.skillDir, e.name, 'SKILL.md')))

      for (const e of skills) {
        const linkPath = path.join(targetDir, e.name)
        const sourcePath = path.join(sourcePaths.skillDir, e.name)

        if (fs.existsSync(linkPath)) {
          if (fs.lstatSync(linkPath).isSymbolicLink()) {
            continue
          }
          fs.rmSync(linkPath, { recursive: true, force: true })
        }
        fs.symlinkSync(sourcePath, linkPath, 'dir')
        linked++
      }

      if (linked > 0) {
        console.log(chalk.dim(`  ${' '.repeat(4)}symlink: ${linked} skills → ${targetDir}`))
      }
    }
  }

  console.log(chalk.green(`\n✔ 同步完成`))
  if (useLink) {
    console.log(chalk.cyan('💡 技能仅存储在 OpenCode 目录，其他 Agent 通过 symlink 引用'))
    console.log(chalk.cyan('   新增技能时放入 ~/.config/opencode/skills/ 即可'))
  }
}
