import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type {
  SkillRecord, MCPServerRecord, CommandRecord, AgentRecord,
  ScanResult
} from './types.js'
import { RegistryStorage } from './storage.js'

export interface ScannerConfig {
  opencodeConfigPath?: string
  skillDirectories?: { path: string; scope: 'opencode' | 'project' | 'user' }[]
  mcpGroupsPath?: string
}

function home(...parts: string[]) {
  return path.join(process.env.HOME || '/tmp', ...parts)
}

function discoverSkillDirs(): { path: string; scope: 'opencode' | 'project' | 'user' }[] {
  const candidates = [
    { path: home('.config', 'opencode', 'skills'), scope: 'opencode' as const },
    { path: home('.claude', 'skills'), scope: 'user' as const },
  ]
  return candidates.filter(d => fs.existsSync(d.path))
}

function defaultConfig(): ScannerConfig {
  return {
    opencodeConfigPath: process.env.OPENCODE_CONFIG_PATH || home('.config', 'opencode', 'opencode.json'),
    mcpGroupsPath: process.env.OPENCODE_MCP_GROUPS_PATH || home('.config', 'opencode', 'mcp-groups.json'),
    skillDirectories: process.env.OPENCODE_SKILL_DIRS
      ? process.env.OPENCODE_SKILL_DIRS.split(',').map(s => {
          const [p, scope] = s.split(':')
          return { path: p.trim(), scope: (scope?.trim() || 'opencode') as any }
        })
      : discoverSkillDirs()
  }
}

export class Scanner {
  private storage: RegistryStorage
  private errors: string[] = []
  private config: ScannerConfig

  constructor(storage: RegistryStorage, config?: ScannerConfig) {
    this.storage = storage
    this.config = config || defaultConfig()
  }

  async scanAll(): Promise<ScanResult> {
    const start = Date.now()
    let newRecords = 0, updatedRecords = 0

    const config = this.loadOpenCodeConfig(this.config.opencodeConfigPath)
    if (!config) {
      return { newRecords: 0, updatedRecords: 0, removedRecords: 0, skipped: 0, errors: ['Cannot load opencode.json'], duration: 0 }
    }

    this.storage.beginTransaction()
    try {
      const mcpResult = this.scanMCPServers(config)
      newRecords += mcpResult.new; updatedRecords += mcpResult.updated

      const cmdResult = this.scanCommands(config)
      newRecords += cmdResult.new; updatedRecords += cmdResult.updated

      const agentResult = this.scanAgents(config)
      newRecords += agentResult.new; updatedRecords += agentResult.updated

      const skillResult = await this.scanSkills()
      newRecords += skillResult.new; updatedRecords += skillResult.updated

      const staleCount = this.validateStaleEntries()
      this.storage.setMeta('lastScanned', new Date().toISOString())
      this.storage.commit()
    } catch (e: any) {
      this.storage.rollback()
      this.errors.push(e.message)
      return { newRecords: 0, updatedRecords: 0, removedRecords: 0, skipped: 0, errors: this.errors, duration: Date.now() - start }
    }

    return {
      newRecords, updatedRecords, removedRecords: 0, skipped: 0,
      errors: this.errors, duration: Date.now() - start
    }
  }

  private loadOpenCodeConfig(configPath?: string): any {
    if (!configPath) return null
    if (fs.existsSync(configPath)) {
      try { return JSON.parse(fs.readFileSync(configPath, 'utf-8')) }
      catch { this.errors.push(`Failed to parse ${configPath}`) }
    } else {
      this.errors.push(`Config not found: ${configPath}`)
    }
    return null
  }

  private loadMCPGroups(): Record<string, string[]> {
    if (!this.config.mcpGroupsPath || !fs.existsSync(this.config.mcpGroupsPath)) return {}
    try {
      const data = JSON.parse(fs.readFileSync(this.config.mcpGroupsPath, 'utf-8'))
      const groups: Record<string, string[]> = {}
      for (const [gName, gCfg] of Object.entries(data.groups || {})) {
        const g = gCfg as any
        groups[gName] = g.servers || []
      }
      return groups
    } catch { return {} }
  }

  private scanMCPServers(config: any): { new: number; updated: number } {
    let newC = 0, updC = 0
    const mcpSection = config.mcp || config.mcpServers || {}
    const groupMap = this.loadMCPGroups()
    const serverToGroups: Record<string, string[]> = {}
    for (const [g, servers] of Object.entries(groupMap)) {
      for (const s of servers) {
        if (!serverToGroups[s]) serverToGroups[s] = []
        serverToGroups[s].push(g)
      }
    }

    for (const [name, cfg] of Object.entries(mcpSection)) {
      const c = cfg as any
      const rawCmd = c.command || c.args || []
      const command = Array.isArray(rawCmd) ? rawCmd[0] || '' : rawCmd
      const args = Array.isArray(rawCmd) ? rawCmd.slice(1) : []
      const record: MCPServerRecord = {
        kind: 'mcp', id: `mcp_${name}`, name, version: '1.0.0',
        description: c.description || '',
        tags: c.tags || [],
        command, args,
        env: c.env || {},
        transport: c.transport || (command ? 'stdio' : 'http'),
        lazyLoad: c.lazyLoad ?? true,
        groups: serverToGroups[name] || c.groups || [],
        source: this.detectMCPSource(c),
        sourceUrl: c.sourceUrl || '',
        enabled: c.enabled !== false,
        createdAt: '', updatedAt: ''
      }
      const r = this.storage.upsertMCPServer(record)
      if (r.action === 'created') newC++; else updC++
    }
    return { new: newC, updated: updC }
  }

  private detectMCPSource(cfg: any): MCPServerRecord['source'] {
    const raw = cfg.command || cfg.args || ''
    const cmdStr = Array.isArray(raw) ? raw.join(' ') : String(raw)
    if (cmdStr.includes('npx')) return 'npm'
    if (cmdStr.includes('uvx') || cmdStr.includes('pip')) return 'pip'
    return 'local'
  }

  private scanCommands(config: any): { new: number; updated: number } {
    let newC = 0, updC = 0
    const cmds = config.command || {}
    for (const [name, cfg] of Object.entries(cmds)) {
      const c = cfg as any
      const template = c.template || ''
      const record: CommandRecord = {
        kind: 'command', id: `cmd_${name}`, name, version: '1.0.0',
        description: c.description || '',
        tags: c.tags || [],
        scope: c.scope || 'opencode',
        templateLength: template.length,
        enabled: c.enabled !== false,
        source: 'local',
        createdAt: '', updatedAt: ''
      }
      const r = this.storage.upsertCommand(record)
      if (r.action === 'created') newC++; else updC++
    }
    return { new: newC, updated: updC }
  }

  private scanAgents(config: any): { new: number; updated: number } {
    let newC = 0, updC = 0
    const agents = config.agent || {}
    for (const [name, cfg] of Object.entries(agents)) {
      const a = cfg as any
      const record: AgentRecord = {
        kind: 'agent', id: `agent_${name}`, name, version: '1.0.0',
        description: a.description || '',
        tags: a.tags || [],
        model: a.model || '',
        skills: a.skills || [],
        mcpServers: a.mcpServers || [],
        enabled: a.enabled !== false,
        source: 'local',
        createdAt: '', updatedAt: ''
      }
      const r = this.storage.upsertAgent(record)
      if (r.action === 'created') newC++; else updC++
    }
    return { new: newC, updated: updC }
  }

  private async scanSkills(): Promise<{ new: number; updated: number }> {
    let newC = 0, updC = 0
    const dirs = this.config.skillDirectories || []

    for (const dir of dirs) {
      if (!fs.existsSync(dir.path)) continue
      const entries = fs.readdirSync(dir.path, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillPath = path.join(dir.path, entry.name, 'SKILL.md')
        if (!fs.existsSync(skillPath)) continue

        try {
          const content = fs.readFileSync(skillPath, 'utf-8')
          const checksum = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
          const stats = fs.statSync(skillPath)
          const meta = this.parseSkillFrontmatter(content)
          const refDir = path.join(dir.path, entry.name, 'references')
          const refFiles = fs.existsSync(refDir) ? fs.readdirSync(refDir) : []
          const category = this.classifySkill(entry.name, meta.description || '', meta.category)

          const record: SkillRecord = {
            kind: 'skill', id: `skill_${entry.name}`,
            name: entry.name, version: '1.0.0',
            description: meta.description || entry.name,
            category,
            tags: meta.tags || [],
            source: 'local',
            sourceUrl: '',
            filePath: skillPath, checksum, fileSize: stats.size,
            mcpDependencies: meta.mcpDependencies || [],
            referenceFiles: refFiles,
            scope: dir.scope,
            enabled: true,
            createdAt: '', updatedAt: ''
          }
          const r = this.storage.upsertSkill(record)
          if (r.action === 'created') newC++; else updC++
        } catch (e: any) {
          this.errors.push(`Error scanning skill ${entry.name}: ${e.message}`)
        }
      }
    }
    return { new: newC, updated: updC }
  }

  private validateStaleEntries(): number {
    let stale = 0
    const skills = this.storage.listSkills()
    for (const s of skills) {
      if (!fs.existsSync(s.filePath)) {
        this.errors.push(`Stale: ${s.name} (${s.filePath})`)
        stale++
      }
    }
    return stale
  }

  private parseSkillFrontmatter(content: string): {
    description?: string; category?: string; tags?: string[]; mcpDependencies?: string[]
  } {
    const result: any = {}
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return result
    const frontmatter = match[1]

    const desc = frontmatter.match(/description:\s*(.+)/i)
    if (desc) result.description = desc[1].trim()

    let cat: RegExpMatchArray | null

    cat = frontmatter.match(/category:\s*(.+)/i)
    if (cat) result.category = cat[1].trim()

    const domain = frontmatter.match(/domain:\s*(.+)/i)
    if (domain) result.category = result.category || domain[1].trim()

    const compat = frontmatter.match(/compatibility:\s*(.+)/i)
    if (compat && !result.category) {
      result.category = compat[1].trim()
    }

    const tagsMatch = frontmatter.match(/tags:\s*(.+)/i)
    if (tagsMatch) {
      result.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^\[|\]$/g, ''))
    }

    return result
  }

  private classifySkill(name: string, desc: string, fmCategory?: string): string {
    if (fmCategory) return fmCategory

    const n = name.toLowerCase()

    const nameRules: [RegExp, string][] = [
      [/^angular/, 'frontend'], [/^vue-/, 'frontend'], [/^react-/, 'frontend'],
      [/^nextjs/, 'frontend'], [/^frontend-/, 'frontend'], [/^web-/, 'frontend'],
      [/^springboot/, 'backend'], [/^django/, 'backend'], [/^fastapi/, 'backend'],
      [/^nestjs/, 'backend'], [/^backend-/, 'backend'], [/^laravel/, 'backend'],
      [/^rails-/, 'backend'], [/^fullstack/, 'backend'], [/^dotnet/, 'backend'],
      [/^python-/, 'language'], [/^rust-/, 'language'], [/^golang-/, 'language'],
      [/^java-/, 'language'], [/^typescript-/, 'language'], [/^cpp-/, 'language'],
      [/^csharp/, 'language'], [/^kotlin-/, 'language'], [/^swift-/, 'language'],
      [/^javascript-/, 'language'], [/^php-/, 'language'],
      [/^postgres/, 'data-ml'], [/^clickhouse/, 'data-ml'], [/^sql-/, 'data-ml'],
      [/^database-/, 'data-ml'], [/^pandas-/, 'data-ml'], [/^spark-/, 'data-ml'],
      [/^ml-/, 'data-ml'], [/^rag-/, 'data-ml'], [/^fine-tuning/, 'data-ml'],
      [/^docker/, 'infrastructure'], [/^kubernetes/, 'infrastructure'],
      [/^terraform/, 'infrastructure'], [/^devops-/, 'infrastructure'],
      [/^sre-/, 'infrastructure'], [/^monitoring/, 'infrastructure'],
      [/^cloud-/, 'infrastructure'],
      [/^security/, 'security'], [/^secure-/, 'security'],
      [/^tdd-/, 'quality'], [/^test-/, 'quality'], [/^code-review/, 'quality'],
      [/^api-/, 'api-architecture'], [/^graphql/, 'api-architecture'],
      [/^websocket/, 'api-architecture'],
      [/^opencode-/, 'platform'], [/^cli-/, 'platform'], [/^mcp-/, 'platform'],
      [/^customize-/, 'platform'], [/^shopify/, 'platform'], [/^wordpress/, 'platform'],
      [/^salesforce/, 'platform'], [/^atlassian/, 'platform'],
      [/^game-/, 'specialized'], [/^embedded/, 'specialized'],
      [/^flutter/, 'specialized'], [/^react-native/, 'specialized'],
      [/^planning/, 'workflow'], [/^brainstorm/, 'workflow'],
      [/^feature-/, 'workflow'], [/^doc-/, 'workflow'], [/^writing-/, 'workflow'],
      [/^internal-/, 'workflow'], [/^kaizen/, 'workflow'],
      [/^adversarial/, 'workflow'], [/^hyperplan/, 'workflow'],
      [/^strategic-/, 'workflow'], [/^long-task/, 'workflow'],
      [/^pre-publish/, 'workflow'], [/^work-with/, 'workflow'],
      [/^continuous-learning/, 'workflow'], [/^iterative-/, 'workflow'],
      [/^project-guidelines/, 'workflow'],
      [/^c-drive/, 'platform'], [/^github-triage/, 'devops'],
      [/^hermes/, 'platform'], [/^lsp-/, 'platform'],
      [/^karpathy/, 'quality'], [/^self-heal/, 'platform'],
      [/^verification-/, 'platform'], [/^performance-opt/, 'platform'],
      [/^demo-/, 'platform'], [/^dbg/, 'platform'],
      [/^pdca-/, 'workflow'], [/^pdf$/, 'platform'],
    ]

    for (const [pattern, cat] of nameRules) {
      if (pattern.test(n)) return cat
    }

    const d = desc.toLowerCase()
    const descRules: [RegExp, string][] = [
      [/(spring boot|rest api|controller|service layer)/, 'backend'],
      [/(react|vue|angular|next\.js|frontend|ui\/ux)/, 'frontend'],
      [/(database|sql|postgresql|clickhouse|pandas|spark)/, 'data-ml'],
      [/(testing?|tdd|coverage|qa\b)/, 'quality'],
      [/(security|owasp|vulnerability)/, 'security'],
      [/(opencode|claude code)/, 'platform'],
      [/(docker|kubernetes|terraform|devops|infra)/, 'infrastructure'],
      [/(api|graphql|websocket|rest)/, 'api-architecture'],
    ]

    for (const [pattern, cat] of descRules) {
      if (pattern.test(d)) return cat
    }

    return 'uncategorized'
  }
}
