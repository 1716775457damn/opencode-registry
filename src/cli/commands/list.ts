import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind } from '../../core/types.js'

export function listCommand(storage: RegistryStorage, type: string, opts: any) {
  const kind = type as ItemKind
  const showEnabled = opts.enabled ? true : opts.disabled ? false : undefined

  switch (kind) {
    case 'skill': {
      const skills = storage.listSkills({ category: opts.category, enabled: showEnabled, scope: opts.scope })
      if (opts.json) return console.log(JSON.stringify(skills, null, 2))
      console.log(chalk.cyan(`\n📦 Skills (${skills.length})`))
      if (opts.category) console.log(chalk.dim(`  分类: ${opts.category}`))
      console.log()
      const byCat: Record<string, typeof skills> = {}
      for (const s of skills) {
        const cat = s.category || 'uncategorized'
        if (!byCat[cat]) byCat[cat] = []
        byCat[cat].push(s)
      }
      for (const [cat, items] of Object.entries(byCat).sort()) {
        console.log(chalk.bold(`  ${cat}/`))
        for (const s of items) {
          const status = s.enabled ? chalk.green('✔') : chalk.dim('✖')
          const scope = chalk.dim(`[${s.scope}]`)
          console.log(`    ${status} ${s.name} ${scope}`)
          if (s.description) console.log(chalk.dim(`       ${s.description.slice(0, 80)}`))
        }
        console.log()
      }
      break
    }
    case 'mcp': {
      const servers = storage.listMCPServers({ group: opts.group, enabled: showEnabled })
      if (opts.json) return console.log(JSON.stringify(servers, null, 2))
      console.log(chalk.cyan(`\n🔌 MCP Servers (${servers.length})`))
      console.log()
      const byGroup: Record<string, typeof servers> = {}
      for (const m of servers) {
        const g = m.groups.length > 0 ? m.groups[0] : 'ungrouped'
        if (!byGroup[g]) byGroup[g] = []
        byGroup[g].push(m)
      }
      for (const [g, items] of Object.entries(byGroup).sort()) {
        console.log(chalk.bold(`  ${g}/`))
        for (const m of items) {
          const status = m.enabled ? chalk.green('✔') : chalk.dim('✖')
          const cmd = chalk.dim(m.command ? m.command.split('/').pop() : '?')
          console.log(`    ${status} ${m.name} ${cmd}`)
        }
        console.log()
      }
      break
    }
    case 'command': {
      const cmds = storage.listCommands({ scope: opts.scope, enabled: showEnabled })
      if (opts.json) return console.log(JSON.stringify(cmds, null, 2))
      console.log(chalk.cyan(`\n⚡ Commands (${cmds.length})`))
      console.log()
      for (const c of cmds) {
        const status = c.enabled ? chalk.green('✔') : chalk.dim('✖')
        const scope = chalk.dim(`[${c.scope}]`)
        const tplSize = c.templateLength > 0 ? chalk.yellow(` ${c.templateLength}B`) : ''
        console.log(`  ${status} /${c.name} ${scope}${tplSize}`)
        if (c.description) console.log(chalk.dim(`     ${c.description.slice(0, 100)}`))
      }
      console.log()
      break
    }
    case 'agent': {
      const agents = storage.listAgents()
      if (opts.json) return console.log(JSON.stringify(agents, null, 2))
      console.log(chalk.cyan(`\n🤖 Agents (${agents.length})`))
      console.log()
      for (const a of agents) {
        const status = a.enabled ? chalk.green('✔') : chalk.dim('✖')
        console.log(`  ${status} ${a.name}`)
        if (a.description) console.log(chalk.dim(`     ${a.description.slice(0, 100)}`))
        if (a.skills.length > 0) console.log(chalk.dim(`     skills: ${a.skills.slice(0, 5).join(', ')}`))
      }
      console.log()
      break
    }
    default:
      console.log(chalk.red(`未知类型: ${type} (可选: skill, mcp, command, agent)`))
  }
}
