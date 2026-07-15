import fs from 'fs'
import os from 'os'
import path from 'path'
import { RegistryStorage } from './storage.js'
import { detectOS, getAgentPaths, osName, type AgentType } from './platform.js'
import type { RegistryRecord, ItemKind } from './types.js'

export interface AIContextOptions {
  query?: string
  kind?: ItemKind
  limit?: number
  includeRecords?: boolean
}

const AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

function fileState(filePath: string) {
  if (!fs.existsSync(filePath)) return { exists: false }
  try {
    const stat = fs.statSync(filePath)
    return { exists: true, size: stat.size, mtime: stat.mtime.toISOString() }
  } catch {
    return { exists: false }
  }
}

function sanitizeRecord(record: RegistryRecord) {
  const base: any = {
    kind: record.kind,
    name: record.name,
    description: record.description,
    enabled: record.enabled,
    tags: record.tags,
  }

  if (record.kind === 'skill') {
    base.category = record.category
    base.scope = record.scope
    base.filePath = record.filePath
    base.mcpDependencies = record.mcpDependencies
    base.referenceFiles = record.referenceFiles
  } else if (record.kind === 'mcp') {
    base.command = record.command
    base.args = record.args
    base.transport = record.transport
    base.groups = record.groups
    base.lazyLoad = record.lazyLoad
    base.envKeys = Object.keys(record.env || {})
  } else if (record.kind === 'command') {
    base.scope = record.scope
    base.templateLength = record.templateLength
  } else if (record.kind === 'agent') {
    base.model = record.model
    base.skills = record.skills
    base.mcpServers = record.mcpServers
  }

  return base
}

function queryTerms(query: string) {
  const lower = query.toLowerCase()
  const terms = lower.split(/[^a-z0-9\u4e00-\u9fa5_.-]+/).filter(t => t.length >= 2)
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

function searchByQuery(storage: RegistryStorage, query: string, kind?: ItemKind) {
  const seen = new Set<string>()
  const results: RegistryRecord[] = []
  for (const term of [query, ...queryTerms(query)]) {
    for (const record of storage.search(term, kind)) {
      const key = `${record.kind}:${record.name}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(record)
    }
  }
  return results
}

function pickRecords(storage: RegistryStorage, opts: AIContextOptions) {
  const limit = Math.max(1, Math.min(opts.limit || 20, 100))
  const records = opts.query
    ? searchByQuery(storage, opts.query, opts.kind)
    : [
        ...storage.listAgents(),
        ...storage.listSkills({ enabled: true }).slice(0, 8),
        ...storage.listMCPServers({ enabled: true }).slice(0, 8),
        ...storage.listCommands({ enabled: true }).slice(0, 4),
      ]
  return records.slice(0, limit).map(sanitizeRecord)
}

function runtimeState() {
  const osType = detectOS()
  return {
    os: osName(osType),
    home: os.homedir(),
    agents: Object.fromEntries(AGENTS.map(agent => {
      const paths = getAgentPaths(agent, osType)
      return [agent, {
        configFile: paths.configFile,
        config: fileState(paths.configFile),
        skillDir: paths.skillDir,
        skills: fileState(paths.skillDir),
      }]
    })),
  }
}

export function buildAIContext(storage: RegistryStorage, opts: AIContextOptions = {}) {
  const summary = storage.getSummary()
  const dbPath = storage.getDbPath()
  const registryRoot = process.cwd()
  const records = opts.includeRecords === false ? [] : pickRecords(storage, opts)

  return {
    formatVersion: 'ai-context.v1',
    generatedAt: new Date().toISOString(),
    purpose: 'Compact, tool-call-friendly snapshot of local OpenCode Registry for AI agents.',
    registry: {
      root: registryRoot,
      dbPath,
      lastScanned: summary.lastScanned,
      dbSizeBytes: summary.dbSize,
    },
    counts: {
      skills: summary.skills,
      mcpServers: summary.mcpServers,
      commands: summary.commands,
      agents: summary.agents,
    },
    runtime: runtimeState(),
    recommendedCalls: [
      'oreg scan',
      'oreg stats --json',
      'oreg search <keyword> --json',
      'oreg info skill <name> --json',
      'oreg info mcp <name> --json',
      'oreg ai-context --query <task> --json',
      'node dist/mcp-server/index.js --json registry_ai_context {"query":"<task>"}',
    ],
    mcpTools: [
      'registry_ai_context',
      'registry_recommend',
      'registry_search',
      'registry_list_skills',
      'registry_list_mcp',
      'registry_get_skill',
      'registry_get_mcp',
      'registry_stats',
      'registry_export_json',
      'registry_search_mcp_by_capability',
      'registry_skill_dependencies',
    ],
    records,
    notes: [
      'Environment variable values are never included; only env key names are exposed.',
      'Use registry_recommend/oreg recommend for task-oriented selection before loading full skill details.',
      'Run oreg check before syncing runtime configs to catch stale entries and broken MCP command shapes.',
    ],
  }
}

export function writeAIContextFile(storage: RegistryStorage, output: string, opts: AIContextOptions = {}) {
  const context = buildAIContext(storage, opts)
  const outPath = path.resolve(output)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(context, null, 2))
  return { output: outPath, context }
}
