#!/usr/bin/env node
import { RegistryStorage } from '../core/storage.js'
import { buildAIContext } from '../core/ai-context.js'
import type { ItemKind } from '../core/types.js'

interface ToolSchema { type: string; properties: Record<string, any>; required?: string[] }
interface ToolDef {
  name: string; description: string; inputSchema: ToolSchema
  handler: (args: any) => any
}

function def(name: string, description: string, props: Record<string, any>, required: string[], handler: (args: any) => any): ToolDef {
  return {
    name, description,
    inputSchema: { type: 'object', properties: props, ...(required.length ? { required } : {}) },
    handler
  }
}

function str(desc: string, required = false) { return { type: 'string', description: desc } }
function bool(desc: string) { return { type: 'boolean', description: desc } }
function num(desc: string) { return { type: 'number', description: desc } }
function taskTerms(task: string) {
  const lower = String(task).toLowerCase()
  const terms = lower.split(/[^a-z0-9\u4e00-\u9fa5_.-]+/).filter((t: string) => t.length >= 2)
  const aliases: Record<string, string[]> = {
    '浏览器': ['browser', 'playwright', 'web'],
    '网页': ['browser', 'web', 'frontend'],
    '自动化': ['automation', 'automated'],
    '测试': ['test', 'testing', 'playwright'],
    '代码审查': ['review', 'code-review', 'github'],
    '数据库': ['database', 'sql', 'postgres'],
    '文档': ['document', 'docs', 'markdown'],
    '部署': ['deploy', 'devops'],
  }
  for (const [zh, mapped] of Object.entries(aliases)) {
    if (lower.includes(zh)) terms.push(...mapped)
  }
  return [...new Set(terms)]
}

function main() {
  const storage = new RegistryStorage()

  const tools: ToolDef[] = [
    def('registry_search', '搜索注册中心中的技能/MCP/命令/代理',
      { query: str('搜索关键词', true), kind: str('限定类型: skill|mcp|command|agent'), limit: num('返回条数上限') },
      ['query'],
      (args) => {
        const results = storage.search(args.query, args.kind)
        return results.slice(0, args.limit || 20).map(r => ({
          kind: r.kind, name: r.name, description: r.description?.slice(0, 100),
          enabled: r.enabled, tags: r.tags
        }))
      }),

    def('registry_ai_context', '输出 AI 可直接消费的注册中心上下文快照（统计、路径、推荐调用、匹配记录）',
      { query: str('按任务/关键词筛选记录'), kind: str('限定类型: skill|mcp|command|agent'), limit: num('返回记录上限'), includeRecords: bool('是否包含记录列表') }, [],
      (args) => buildAIContext(storage, {
        query: args.query,
        kind: args.kind as ItemKind | undefined,
        limit: args.limit,
        includeRecords: args.includeRecords !== false,
      })),

    def('registry_recommend', '根据自然语言任务推荐适合的 Skill/MCP/Agent，并给出下一步 CLI 调用',
      { task: str('任务描述', true), kind: str('限定类型: skill|mcp|command|agent'), limit: num('返回条数上限') }, ['task'],
      (args) => {
        const terms = taskTerms(args.task)
        const pools = args.kind ? storage.search(args.task, args.kind) : [
          ...storage.search(args.task),
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
            const hay = `${r.name} ${r.description} ${r.tags.join(' ')}`.toLowerCase()
            const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0) + (r.enabled ? 0.25 : 0)
            return { r, score }
          })
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
          .slice(0, args.limit || 10)
        return ranked.map(x => ({
          kind: x.r.kind,
          name: x.r.name,
          score: Number(x.score.toFixed(2)),
          enabled: x.r.enabled,
          description: x.r.description,
          next: `oreg info ${x.r.kind} ${x.r.name} --json`,
        }))
      }),

    def('registry_list_skills', '列出注册的所有技能',
      { category: str('按分类筛选'), enabled: bool('仅已启用的') }, [],
      (args) => storage.listSkills({ category: args.category, enabled: args.enabled })),

    def('registry_list_mcp', '列出注册的所有 MCP 服务器',
      { group: str('按分组筛选'), enabled: bool('仅已启用的') }, [],
      (args) => storage.listMCPServers({ group: args.group, enabled: args.enabled })),

    def('registry_get_skill', '获取技能的详细信息',
      { name: str('技能名称', true) }, ['name'],
      (args) => storage.getSkill(args.name) || { error: 'not found' }),

    def('registry_get_mcp', '获取 MCP 服务器的详细信息',
      { name: str('MCP 名称', true) }, ['name'],
      (args) => storage.getMCPServer(args.name) || { error: 'not found' }),

    def('registry_stats', '获取注册中心统计概览', {}, [],
      () => {
        const s = storage.getSummary()
        return {
          skills: { total: s.skills.total, enabled: s.skills.enabled, categories: s.skills.categories },
          mcpServers: { total: s.mcpServers.total, enabled: s.mcpServers.enabled, groups: s.mcpServers.groups },
          commands: { total: s.commands.total, enabled: s.commands.enabled },
          agents: { total: s.agents.total, enabled: s.agents.enabled },
          dbSize: `${(s.dbSize / 1024).toFixed(1)} KB`, lastScanned: s.lastScanned
        }
      }),

    def('registry_export_json', '导出注册中心数据为 JSON',
      { types: str('导出类型: skill,mcp,command,agent') }, [],
      (args) => {
        const types = (args.types || 'skill,mcp,command,agent').split(',').map((t: string) => t.trim())
        const records: any[] = []
        for (const t of types) {
          switch (t) {
            case 'skill': records.push(...storage.listSkills()); break
            case 'mcp': records.push(...storage.listMCPServers()); break
            case 'command': records.push(...storage.listCommands()); break
            case 'agent': records.push(...storage.listAgents()); break
          }
        }
        return { formatVersion: '1.0', exportedAt: new Date().toISOString(), total: records.length, records }
      }),

    def('registry_search_mcp_by_capability', '根据能力关键词搜索适合的 MCP 服务器',
      { query: str('能力描述，如 browser, search, database', true) }, ['query'],
      (args) => storage.search(args.query, 'mcp').map(r => ({
        name: r.name, description: r.description?.slice(0, 150),
        command: (r as any).command, groups: (r as any).groups, enabled: r.enabled
      }))),

    def('registry_skill_dependencies', '查看技能的 MCP 依赖关系图',
      { name: str('技能名称', true) }, ['name'],
      (args) => {
        const skill = storage.getSkill(args.name)
        if (!skill) return { error: 'not found' }
        const deps = skill.mcpDependencies
        const mcps = deps.map(d => storage.getMCPServer(d)).filter(Boolean)
        return {
          skill: skill.name, mcpDependencies: deps,
          mcpDetails: mcps.map(m => ({ name: m!.name, enabled: m!.enabled, command: m!.command })),
          missing: deps.filter(d => !storage.getMCPServer(d))
        }
      }),
  ]

  const isJSON = process.argv.includes('--json')

  if (isJSON) {
    const [, , cmd, ...rest] = process.argv.filter(a => a !== '--json')
    if (cmd) {
      const found = tools.find(t => t.name === cmd)
      if (found) {
        const input = rest.length > 0 ? JSON.parse(rest.join(' ')) : {}
        console.log(JSON.stringify(found.handler(input), null, 2))
      } else {
        console.log(JSON.stringify({ error: `unknown tool: ${cmd}` }))
      }
    } else {
      console.log(JSON.stringify(tools.map(t => ({ name: t.name, description: t.description })), null, 2))
    }
    return
  }

  Promise.all([
    import('@modelcontextprotocol/sdk/server/index.js'),
    import('@modelcontextprotocol/sdk/server/stdio.js'),
    import('@modelcontextprotocol/sdk/types.js'),
  ]).then(async ([{ Server }, { StdioServerTransport }, { ListToolsRequestSchema, CallToolRequestSchema }]: any[]) => {
      const server = new Server(
        { name: 'opencode-registry', version: '0.1.0' },
        { capabilities: { tools: {} } }
      )

      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
      }))

      server.setRequestHandler(CallToolRequestSchema, async (req: any) => {
        const tool = tools.find(t => t.name === req.params.name)
        if (!tool) return { content: [{ type: 'text', text: JSON.stringify({ error: 'unknown tool' }) }] }
        const args = req.params.arguments || {}
        const result = tool.handler(args)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      })

      const transport = new StdioServerTransport()
      await server.connect(transport)
  }).catch((e: any) => {
    console.error('opencode-registry MCP server failed to start:', e?.stack || e)
    process.exit(1)
  })
}

main()
