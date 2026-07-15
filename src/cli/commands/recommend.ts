import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind } from '../../core/types.js'

function scoreText(text: string, terms: string[]) {
  const hay = text.toLowerCase()
  return terms.reduce((score, term) => score + (hay.includes(term) ? 1 : 0), 0)
}

function uniqueTerms(task: string) {
  const lower = task.toLowerCase()
  const terms = lower.split(/[^a-z0-9\u4e00-\u9fa5_.-]+/).filter(t => t.length >= 2)
  const aliases: Record<string, string[]> = {
    '浏览器': ['browser', 'playwright', 'web'],
    '网页': ['browser', 'web', 'frontend'],
    '自动化': ['automation', 'automated'],
    '测试': ['test', 'testing', 'playwright'],
    '代码审查': ['review', 'code-review', 'github'],
    '拉取请求': ['pull', 'request', 'github', 'review'],
    '数据库': ['database', 'sql', 'postgres'],
    '文档': ['document', 'docs', 'markdown'],
    '图片': ['image', 'media'],
    '视频': ['video', 'media'],
    '部署': ['deploy', 'devops'],
  }
  for (const [zh, mapped] of Object.entries(aliases)) {
    if (lower.includes(zh)) terms.push(...mapped)
  }
  return [...new Set(terms)]
}

export function recommendCommand(storage: RegistryStorage, task: string, opts: any) {
  const terms = uniqueTerms(task)
  const limit = Math.max(1, Math.min(Number(opts.limit || 10), 50))
  const kind = opts.type as ItemKind | undefined
  const pools = kind
    ? storage.search(task, kind)
    : [
        ...storage.search(task),
        ...storage.listSkills({ enabled: true }),
        ...storage.listMCPServers({ enabled: true }),
        ...storage.listAgents(),
      ]

  const seen = new Set<string>()
  const ranked = pools
    .filter(r => {
      const key = `${r.kind}:${r.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(r => {
      const extra = r.kind === 'skill'
        ? `${r.category} ${r.mcpDependencies.join(' ')} ${r.referenceFiles.join(' ')}`
        : r.kind === 'mcp'
          ? `${r.command} ${r.args.join(' ')} ${r.groups.join(' ')}`
          : r.kind === 'agent'
            ? `${r.model} ${r.skills.join(' ')} ${r.mcpServers.join(' ')}`
            : r.scope
      const score = scoreText(`${r.name} ${r.description} ${r.tags.join(' ')} ${extra}`, terms) + (r.enabled ? 0.25 : 0)
      return { r, score }
    })
    .filter(x => x.score > 0 || pools.length <= limit)
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)

  const result = ranked.map(x => ({
    kind: x.r.kind,
    name: x.r.name,
    score: Number(x.score.toFixed(2)),
    enabled: x.r.enabled,
    description: x.r.description,
    use: x.r.kind === 'skill'
      ? `oreg info skill ${x.r.name}`
      : x.r.kind === 'mcp'
        ? `oreg info mcp ${x.r.name}`
        : x.r.kind === 'agent'
          ? `oreg info agent ${x.r.name}`
          : `oreg info command ${x.r.name}`,
  }))

  if (opts.json) {
    console.log(JSON.stringify({ task, terms, recommendations: result }, null, 2))
    return
  }

  console.log(chalk.cyan(`\n🧭 AI 推荐: ${task}`))
  if (result.length === 0) {
    console.log(chalk.yellow('  未找到推荐项'))
    return
  }
  for (const item of result) {
    const status = item.enabled ? chalk.green('✔') : chalk.dim('✖')
    console.log(`  ${status} ${chalk.bold(item.kind)} ${item.name} ${chalk.dim(`score=${item.score}`)}`)
    if (item.description) console.log(chalk.dim(`     ${item.description.slice(0, 100)}`))
    console.log(chalk.dim(`     ${item.use}`))
  }
  console.log()
}
