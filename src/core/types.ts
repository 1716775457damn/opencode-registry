export type ItemKind = 'skill' | 'mcp' | 'command' | 'agent'
export type ItemSource = 'local' | 'git' | 'npm' | 'pip' | 'uvx' | 'npx' | 'docker' | 'registry'
export type MCPTransport = 'stdio' | 'http' | 'sse'
export type CommandScope = 'builtin' | 'plugin' | 'project' | 'opencode'
export type SkillScope = 'opencode' | 'project' | 'user'

export interface BaseRegistryItem {
  id: string
  name: string
  version: string
  description: string
  tags: string[]
  enabled: boolean
  source: ItemSource
  sourceUrl?: string
  createdAt: string
  updatedAt: string
}

export interface SkillRecord extends BaseRegistryItem {
  kind: 'skill'
  category: string
  filePath: string
  checksum: string
  fileSize: number
  mcpDependencies: string[]
  referenceFiles: string[]
  scope: SkillScope
}

export interface MCPServerRecord extends BaseRegistryItem {
  kind: 'mcp'
  command: string
  args: string[]
  env: Record<string, string>
  transport: MCPTransport
  lazyLoad: boolean
  groups: string[]
}

export interface CommandRecord extends BaseRegistryItem {
  kind: 'command'
  scope: CommandScope
  templateLength: number
}

export interface AgentRecord extends BaseRegistryItem {
  kind: 'agent'
  model: string
  skills: string[]
  mcpServers: string[]
}

export type RegistryRecord = SkillRecord | MCPServerRecord | CommandRecord | AgentRecord

export interface RegistrySummary {
  skills: { total: number; enabled: number; categories: Record<string, number> }
  mcpServers: { total: number; enabled: number; groups: Record<string, number> }
  commands: { total: number; enabled: number; scopes: Record<string, number> }
  agents: { total: number; enabled: number }
  skillSources: { path: string; count: number; scope: string }[]
  dbSize: number
  lastScanned: string
}

export interface PackageManifest {
  formatVersion: '1.0'
  type: 'skill' | 'mcp' | 'command' | 'agent'
  name: string
  version: string
  description: string
  tags: string[]
  createdAt: string
  dependencies?: {
    mcpServers?: string[]
    skills?: string[]
  }
  files?: string[]
}

export interface ImportOptions {
  format: 'json' | 'zip' | 'git'
  source: string
  dryRun?: boolean
  overwrite?: boolean
}

export interface ExportOptions {
  format: 'json' | 'zip'
  types: ItemKind[]
  output: string
  filter?: { tags?: string[]; enabled?: boolean; category?: string }
}

export interface ScanResult {
  newRecords: number
  updatedRecords: number
  removedRecords: number
  skipped: number
  errors: string[]
  duration: number
}
