import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type {
  SkillRecord, MCPServerRecord, CommandRecord, AgentRecord,
  RegistryRecord, RegistrySummary, ItemKind
} from './types.js'

export class RegistryStorage {
  private db: Database.Database
  private dbPath: string

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(
      process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '/tmp', '.config'),
      'opencode', 'registry.db'
    )
    const dir = path.dirname(this.dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        version TEXT DEFAULT '1.0.0',
        description TEXT DEFAULT '',
        category TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        source TEXT DEFAULT 'local',
        source_url TEXT,
        file_path TEXT,
        checksum TEXT,
        file_size INTEGER DEFAULT 0,
        mcp_dependencies TEXT DEFAULT '[]',
        reference_files TEXT DEFAULT '[]',
        scope TEXT DEFAULT 'opencode',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        version TEXT DEFAULT '1.0.0',
        description TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        command TEXT DEFAULT '',
        args TEXT DEFAULT '[]',
        env TEXT DEFAULT '{}',
        transport TEXT DEFAULT 'stdio',
        lazy_load INTEGER DEFAULT 1,
        groups TEXT DEFAULT '[]',
        source TEXT DEFAULT 'local',
        source_url TEXT,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        version TEXT DEFAULT '1.0.0',
        description TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        scope TEXT DEFAULT 'opencode',
        template_length INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        version TEXT DEFAULT '1.0.0',
        description TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        model TEXT DEFAULT '',
        skills TEXT DEFAULT '[]',
        mcp_servers TEXT DEFAULT '[]',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
      CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
      CREATE INDEX IF NOT EXISTS idx_mcp_name ON mcp_servers(name);
      CREATE INDEX IF NOT EXISTS idx_commands_name ON commands(name);
      CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
    `)
  }

  close() { this.db.close() }

  getDbPath() { return this.dbPath }

  upsertSkill(s: SkillRecord) {
    const existing = this.db.prepare('SELECT id FROM skills WHERE name = ?').get(s.name) as any
    if (existing) {
      s.id = existing.id
      this.db.prepare(`
        UPDATE skills SET version=?, description=?, category=?, tags=?, source=?, source_url=?,
          file_path=?, checksum=?, file_size=?, mcp_dependencies=?, reference_files=?,
          scope=?, enabled=?, updated_at=datetime('now')
        WHERE id = ?
      `).run(s.version, s.description, s.category, JSON.stringify(s.tags), s.source, s.sourceUrl || null,
        s.filePath, s.checksum, s.fileSize, JSON.stringify(s.mcpDependencies), JSON.stringify(s.referenceFiles),
        s.scope, s.enabled ? 1 : 0, s.id)
      return { action: 'updated' as const, id: s.id }
    }
    s.id = s.id || `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO skills (id, name, version, description, category, tags, source, source_url,
        file_path, checksum, file_size, mcp_dependencies, reference_files, scope, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.id, s.name, s.version, s.description, s.category, JSON.stringify(s.tags),
      s.source, s.sourceUrl || null, s.filePath, s.checksum, s.fileSize,
      JSON.stringify(s.mcpDependencies), JSON.stringify(s.referenceFiles), s.scope, s.enabled ? 1 : 0)
    return { action: 'created' as const, id: s.id }
  }

  getSkill(name: string): SkillRecord | undefined {
    const r = this.db.prepare('SELECT * FROM skills WHERE name = ?').get(name) as any
    return r ? this.rowToSkill(r) : undefined
  }

  listSkills(opts?: { category?: string; enabled?: boolean; tags?: string[]; scope?: string }): SkillRecord[] {
    let sql = 'SELECT * FROM skills WHERE 1=1'
    const params: any[] = []
    if (opts?.category) { sql += ' AND category = ?'; params.push(opts.category) }
    if (opts?.enabled !== undefined) { sql += ' AND enabled = ?'; params.push(opts.enabled ? 1 : 0) }
    if (opts?.scope) { sql += ' AND scope = ?'; params.push(opts.scope) }
    sql += ' ORDER BY name'
    const stmt = this.db.prepare(sql)
    const rows: any[] = params.length > 0 ? stmt.all(...params) : stmt.all()
    return rows.map(r => this.rowToSkill(r))
  }

  removeSkill(name: string) {
    this.db.prepare('DELETE FROM skills WHERE name = ?').run(name)
  }

  skillCount() {
    const r = this.db.prepare('SELECT COUNT(*) as c FROM skills').get() as any
    return r.c
  }

  upsertMCPServer(m: MCPServerRecord) {
    const existing = this.db.prepare('SELECT id FROM mcp_servers WHERE name = ?').get(m.name) as any
    if (existing) {
      m.id = existing.id
      this.db.prepare(`
        UPDATE mcp_servers SET version=?, description=?, tags=?, command=?, args=?, env=?,
          transport=?, lazy_load=?, groups=?, source=?, source_url=?, enabled=?, updated_at=datetime('now')
        WHERE id = ?
      `).run(m.version, m.description, JSON.stringify(m.tags), m.command, JSON.stringify(m.args),
        JSON.stringify(m.env), m.transport, m.lazyLoad ? 1 : 0, JSON.stringify(m.groups),
        m.source, m.sourceUrl || null, m.enabled ? 1 : 0, m.id)
      return { action: 'updated' as const, id: m.id }
    }
    m.id = m.id || `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO mcp_servers (id, name, version, description, tags, command, args, env,
        transport, lazy_load, groups, source, source_url, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(m.id, m.name, m.version, m.description, JSON.stringify(m.tags), m.command,
      JSON.stringify(m.args), JSON.stringify(m.env), m.transport, m.lazyLoad ? 1 : 0,
      JSON.stringify(m.groups), m.source, m.sourceUrl || null, m.enabled ? 1 : 0)
    return { action: 'created' as const, id: m.id }
  }

  getMCPServer(name: string): MCPServerRecord | undefined {
    const r = this.db.prepare('SELECT * FROM mcp_servers WHERE name = ?').get(name) as any
    return r ? this.rowToMCP(r) : undefined
  }

  listMCPServers(opts?: { group?: string; enabled?: boolean }): MCPServerRecord[] {
    let sql = 'SELECT * FROM mcp_servers WHERE 1=1'
    const params: any[] = []
    if (opts?.enabled !== undefined) { sql += ' AND enabled = ?'; params.push(opts.enabled ? 1 : 0) }
    sql += ' ORDER BY name'
    const rows = this.db.prepare(sql).all(...params) as any[]
    let res = rows.map(r => this.rowToMCP(r))
    if (opts?.group) res = res.filter(m => m.groups.includes(opts.group!))
    return res
  }

  removeMCPServer(name: string) {
    this.db.prepare('DELETE FROM mcp_servers WHERE name = ?').run(name)
  }

  mcpCount() {
    const r = this.db.prepare('SELECT COUNT(*) as c FROM mcp_servers').get() as any
    return r.c
  }

  upsertCommand(c: CommandRecord) {
    const existing = this.db.prepare('SELECT id FROM commands WHERE name = ?').get(c.name) as any
    if (existing) {
      c.id = existing.id
      this.db.prepare(`
        UPDATE commands SET version=?, description=?, tags=?, scope=?, template_length=?,
          enabled=?, updated_at=datetime('now') WHERE id = ?
      `).run(c.version, c.description, JSON.stringify(c.tags), c.scope, c.templateLength,
        c.enabled ? 1 : 0, c.id)
      return { action: 'updated' as const, id: c.id }
    }
    c.id = c.id || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO commands (id, name, version, description, tags, scope, template_length, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(c.id, c.name, c.version, c.description, JSON.stringify(c.tags), c.scope, c.templateLength, c.enabled ? 1 : 0)
    return { action: 'created' as const, id: c.id }
  }

  listCommands(opts?: { scope?: string; enabled?: boolean }): CommandRecord[] {
    let sql = 'SELECT * FROM commands WHERE 1=1'
    const params: any[] = []
    if (opts?.enabled !== undefined) { sql += ' AND enabled = ?'; params.push(opts.enabled ? 1 : 0) }
    sql += ' ORDER BY name'
    return (this.db.prepare(sql).all(...params) as any[]).map(r => this.rowToCommand(r))
  }

  upsertAgent(a: AgentRecord) {
    const existing = this.db.prepare('SELECT id FROM agents WHERE name = ?').get(a.name) as any
    if (existing) {
      a.id = existing.id
      this.db.prepare(`
        UPDATE agents SET version=?, description=?, tags=?, model=?, skills=?, mcp_servers=?,
          enabled=?, updated_at=datetime('now') WHERE id = ?
      `).run(a.version, a.description, JSON.stringify(a.tags), a.model, JSON.stringify(a.skills),
        JSON.stringify(a.mcpServers), a.enabled ? 1 : 0, a.id)
      return { action: 'updated' as const, id: a.id }
    }
    a.id = a.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.db.prepare(`
      INSERT INTO agents (id, name, version, description, tags, model, skills, mcp_servers, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(a.id, a.name, a.version, a.description, JSON.stringify(a.tags), a.model,
      JSON.stringify(a.skills), JSON.stringify(a.mcpServers), a.enabled ? 1 : 0)
    return { action: 'created' as const, id: a.id }
  }

  listAgents(): AgentRecord[] {
    return (this.db.prepare('SELECT * FROM agents ORDER BY name').all() as any[]).map(r => this.rowToAgent(r))
  }

  setEnabled(kind: ItemKind, name: string, enabled: boolean) {
    const table = this.kindToTable(kind)
    this.db.prepare(`UPDATE ${table} SET enabled = ?, updated_at = datetime('now') WHERE name = ?`)
      .run(enabled ? 1 : 0, name)
  }

  toggleEnabled(kind: ItemKind, name: string): boolean {
    const table = this.kindToTable(kind)
    const r = this.db.prepare(`UPDATE ${table} SET enabled = 1 - enabled, updated_at = datetime('now') WHERE name = ? RETURNING enabled`).get(name) as any
    return r ? r.enabled === 1 : false
  }

  search(query: string, kind?: ItemKind): RegistryRecord[] {
    const results: RegistryRecord[] = []
    const q = `%${query}%`
    for (const k of (kind ? [kind] : ['skill' as const, 'mcp' as const, 'command' as const, 'agent' as const])) {
      const table = this.kindToTable(k)
      const rows = this.db.prepare(
        `SELECT * FROM ${table} WHERE name LIKE ? OR description LIKE ? OR tags LIKE ? ORDER BY name`
      ).all(q, q, q) as any[]
      results.push(...rows.map(r => this.rowToRecord(k, r)))
    }
    return results
  }

  getSummary(): RegistrySummary {
    const s = this.db.prepare('SELECT enabled, category FROM skills').all() as any[]
    const m = this.db.prepare('SELECT enabled FROM mcp_servers').all() as any[]
    const c = this.db.prepare('SELECT enabled, scope FROM commands').all() as any[]
    const a = this.db.prepare('SELECT enabled FROM agents').all() as any[]

    const categories: Record<string, number> = {}
    for (const r of s) {
      if (r.category) categories[r.category] = (categories[r.category] || 0) + 1
    }

    const mcpGroups: Record<string, number> = {}
    const mcpRows = this.db.prepare('SELECT groups FROM mcp_servers').all() as any[]
    for (const r of mcpRows) {
      const gs: string[] = JSON.parse(r.groups)
      for (const g of gs) mcpGroups[g] = (mcpGroups[g] || 0) + 1
    }

    const scopes: Record<string, number> = {}
    for (const r of c) {
      if (r.scope) scopes[r.scope] = (scopes[r.scope] || 0) + 1
    }

    const stat = fs.statSync(this.dbPath)
    return {
      skills: { total: s.length, enabled: s.filter(r => r.enabled).length, categories },
      mcpServers: { total: m.length, enabled: m.filter(r => r.enabled).length, groups: mcpGroups },
      commands: { total: c.length, enabled: c.filter(r => r.enabled).length, scopes },
      agents: { total: a.length, enabled: a.filter(r => r.enabled).length },
      skillSources: [],
      dbSize: stat.size,
      lastScanned: (this.db.prepare("SELECT value FROM metadata WHERE key = 'lastScanned'").get() as any)?.value || 'never'
    }
  }

  setMeta(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run(key, value)
  }

  getMeta(key: string): string | undefined {
    const r = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as any
    return r?.value
  }

  beginTransaction() { this.db.exec('BEGIN') }
  commit() { this.db.exec('COMMIT') }
  rollback() { this.db.exec('ROLLBACK') }

  clearAll() {
    this.db.exec('DELETE FROM skills; DELETE FROM mcp_servers; DELETE FROM commands; DELETE FROM agents')
  }

  private kindToTable(kind: ItemKind): string {
    switch (kind) {
      case 'skill': return 'skills'
      case 'mcp': return 'mcp_servers'
      case 'command': return 'commands'
      case 'agent': return 'agents'
    }
  }

  private rowToSkill(r: any): SkillRecord {
    return {
      kind: 'skill', id: r.id, name: r.name, version: r.version, description: r.description,
      category: r.category, tags: JSON.parse(r.tags || '[]'), source: r.source,
      sourceUrl: r.source_url, filePath: r.file_path, checksum: r.checksum, fileSize: r.file_size,
      mcpDependencies: JSON.parse(r.mcp_dependencies || '[]'),
      referenceFiles: JSON.parse(r.reference_files || '[]'), scope: r.scope, enabled: !!r.enabled,
      createdAt: r.created_at, updatedAt: r.updated_at
    }
  }

  private rowToMCP(r: any): MCPServerRecord {
    return {
      kind: 'mcp', id: r.id, name: r.name, version: r.version, description: r.description,
      tags: JSON.parse(r.tags || '[]'), command: r.command, args: JSON.parse(r.args || '[]'),
      env: JSON.parse(r.env || '{}'), transport: r.transport, lazyLoad: !!r.lazy_load,
      groups: JSON.parse(r.groups || '[]'), source: r.source, sourceUrl: r.source_url,
      enabled: !!r.enabled, createdAt: r.created_at, updatedAt: r.updated_at
    }
  }

  private rowToCommand(r: any): CommandRecord {
    return {
      kind: 'command', id: r.id, name: r.name, version: r.version, description: r.description,
      tags: JSON.parse(r.tags || '[]'), scope: r.scope, templateLength: r.template_length,
      enabled: !!r.enabled, source: 'local',
      createdAt: r.created_at, updatedAt: r.updated_at
    }
  }

  private rowToAgent(r: any): AgentRecord {
    return {
      kind: 'agent', id: r.id, name: r.name, version: r.version, description: r.description,
      tags: JSON.parse(r.tags || '[]'), model: r.model, skills: JSON.parse(r.skills || '[]'),
      mcpServers: JSON.parse(r.mcp_servers || '[]'), enabled: !!r.enabled, source: 'local',
      createdAt: r.created_at, updatedAt: r.updated_at
    }
  }

  private rowToRecord(kind: ItemKind, r: any): RegistryRecord {
    switch (kind) {
      case 'skill': return this.rowToSkill(r)
      case 'mcp': return this.rowToMCP(r)
      case 'command': return this.rowToCommand(r)
      case 'agent': return this.rowToAgent(r)
    }
  }
}
