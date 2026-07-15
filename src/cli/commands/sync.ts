import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { detectOS, getAgentPaths, generateAgentConfig } from '../../core/platform.js'
import type { AgentType } from '../../core/platform.js'

function parseSimpleYaml(text: string): any {
  const root: any = {}
  const stack: Array<{ indent: number; key: string | null; value: any }> = [
    { indent: -1, key: null, value: root }
  ]

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue
    const indent = line.match(/^\s*/)?.[0].length || 0
    const trimmed = line.trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const frame = stack[stack.length - 1]
    const parent = frame.value

    if (trimmed.startsWith('- ')) {
      const payload = trimmed.slice(2)
      if (!Array.isArray(parent)) {
        if (frame.key && stack.length >= 2) {
          const owner = stack[stack.length - 2].value
          owner[frame.key] = []
          frame.value = owner[frame.key]
        } else {
          continue
        }
      }
      const arr = frame.value
      if (!payload.includes(':')) {
        arr.push(payload.replace(/^['"]|['"]$/g, ''))
        continue
      }
      const obj: any = {}
      arr.push(obj)
      const idx = payload.indexOf(':')
      const key = payload.slice(0, idx).trim()
      const value = payload.slice(idx + 1).trim()
      if (value) obj[key] = value.replace(/^['"]|['"]$/g, '')
      else obj[key] = {}
      stack.push({ indent, key: null, value: obj })
      continue
    }

    const idx = trimmed.indexOf(':')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()

    if (value === '') {
      parent[key] = {}
      stack.push({ indent, key, value: parent[key] })
    } else {
      parent[key] = value.replace(/^['"]|['"]$/g, '')
    }
  }

  return root
}

function readHermesConfig() {
  const cfgPath = path.join(process.env.HOME || '/tmp', '.hermes', 'config.yaml')
  try {
    if (!fs.existsSync(cfgPath)) return null
    return parseSimpleYaml(fs.readFileSync(cfgPath, 'utf-8'))
  } catch {
    return null
  }
}

function toOpenCodeProviderName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mergeSkillsConfig(agent: AgentType, existing: any, sourceSkills: string[]) {
  if (agent === 'opencode') {
    return {
      ...existing,
      skills: { ...(existing.skills || {}), paths: sourceSkills }
    }
  }
  return existing
}

function mergeOpenCodeProviders(existing: any, hermesConfig: any) {
  const customProviders = Array.isArray(hermesConfig?.custom_providers) ? hermesConfig.custom_providers : []
  if (customProviders.length === 0) return existing

  const provider = { ...(existing.provider || {}) }
  for (const p of customProviders) {
    if (!p?.model || !p?.base_url) continue
    const name = toOpenCodeProviderName(String(p.name || p.model || 'hermes-provider'))
    const npm = p.api_mode === 'anthropic_messages' ? '@ai-sdk/anthropic' : '@ai-sdk/openai-compatible'
    provider[name] = {
      npm,
      name: p.name || name,
      options: {
        baseURL: p.base_url || '',
        apiKey: p.api_key || p.key || p.key_env || ''
      },
      models: {
        [p.model]: {
          name: p.model
        }
      }
    }
  }

  const modelProvider = hermesConfig?.model?.provider
  const modelDefault = hermesConfig?.model?.default
  let selectedModel = existing.model
  if ((!selectedModel || String(selectedModel).startsWith('opencode/')) && modelProvider && modelDefault) {
    const byName = customProviders.find((p: any) => toOpenCodeProviderName(String(p.name || p.model || '')) === modelProvider)
    const providerName = byName ? modelProvider : toOpenCodeProviderName(String(customProviders.find((p: any) => p.model === modelDefault)?.name || modelProvider))
    selectedModel = `${providerName}/${modelDefault}`
  }

  return {
    ...existing,
    provider,
    model: selectedModel || existing.model
  }
}

function mergeClaudeModelConfig(existing: any, sourceModel?: string) {
  const mappingPath = '/mnt/d/ai-outputs/opencode-registry/claude-model-map.json'
  let mapping: any = {
    default: {
      model: 'claude-sonnet-4-6',
      env: {
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:8327/v1',
        ANTHROPIC_API_KEY: 'sk-test-key',
      },
      maxTokens: 8192,
      permissions: { allow: ['Bash', 'Edit', 'Read', 'Write', 'Glob', 'Grep'] }
    },
    sourceModelMap: {}
  }
  try {
    if (fs.existsSync(mappingPath)) mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'))
  } catch {}
  const selected = (sourceModel && mapping.sourceModelMap?.[sourceModel]) || mapping.default || {}
  const env = {
    ...(existing.env || {}),
    ...(selected.env || {})
  }
  return {
    ...existing,
    env,
    model: selected.model || existing.model || 'claude-sonnet-4-6',
    maxTokens: selected.maxTokens || existing.maxTokens || 8192,
    permissions: selected.permissions || existing.permissions || { allow: ['Bash', 'Edit', 'Read', 'Write', 'Glob', 'Grep'] },
  }
}

function readOpenCodeConfig() {
  const configPath = path.join(process.env.HOME || '/tmp', '.config', 'opencode', 'opencode.json')
  try {
    if (!fs.existsSync(configPath)) return null
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    return null
  }
}

function mergeClaudeFromOpenCode(existing: any, openCodeConfig: any, sourceModel?: string) {
  const providers = openCodeConfig?.provider || {}
  const defaultModel = openCodeConfig?.model || ''

  const sourceProvider = sourceModel?.includes('/') ? sourceModel.split('/')[0] : null
  const sourceBareModel = sourceModel?.includes('/') ? sourceModel.split('/').slice(1).join('/') : sourceModel

  let selected: any = null
  let providerName = ''

  if (sourceProvider && providers[sourceProvider]) {
    const provider = providers[sourceProvider]
    if (provider.models && provider.models[sourceBareModel || defaultModel.split('/').pop()]) {
      selected = provider
      providerName = sourceProvider
    }
  }

  if (!selected && defaultModel.includes('/')) {
    const defProvider = defaultModel.split('/')[0]
    const defModel = defaultModel.split('/').slice(1).join('/')
    if (providers[defProvider] && providers[defProvider].models && providers[defProvider].models[defModel]) {
      selected = providers[defProvider]
      providerName = defProvider
    }
  }

  if (!selected) return existing

  const env = {
    ...(existing.env || {}),
    ANTHROPIC_BASE_URL: selected.options?.baseURL || existing.env?.ANTHROPIC_BASE_URL,
    ANTHROPIC_API_KEY: process.env.QUANTHATCH_API_KEY || selected.options?.apiKey || existing.env?.ANTHROPIC_API_KEY,
    OPENCODE_SOURCE_PROVIDER: providerName || '',
    OPENCODE_SOURCE_MODEL: defaultModel || '',
  }

  return {
    ...existing,
    env,
    model: defaultModel.includes('/') ? defaultModel.split('/').slice(1).join('/') : defaultModel || existing.model,
  }
}

function mergeClaudeFromHermes(existing: any, hermesConfig: any, sourceModel?: string) {
  const customProviders = Array.isArray(hermesConfig?.custom_providers) ? hermesConfig.custom_providers : []
  const defaultProvider = hermesConfig?.model?.provider
  const defaultModel = hermesConfig?.model?.default
  const sourceBareModel = sourceModel?.includes('/') ? sourceModel.split('/').slice(1).join('/') : sourceModel

  const selected = customProviders.find((p: any) => p.model === sourceBareModel)
    || customProviders.find((p: any) => p.model === defaultModel)
    || null

  if (!selected) return existing

  const env = {
    ...(existing.env || {}),
    ANTHROPIC_BASE_URL: selected.base_url || existing.env?.ANTHROPIC_BASE_URL,
    ANTHROPIC_API_KEY: selected.api_key || existing.env?.ANTHROPIC_API_KEY,
    HERMES_SOURCE_PROVIDER: defaultProvider || '',
    HERMES_SOURCE_MODEL: defaultModel || '',
  }

  return {
    ...existing,
    env,
    model: selected.model || defaultModel || existing.model,
  }
}

const VALID_AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

export function syncCommand(storage: RegistryStorage, opts: any) {
  const osType = detectOS()
  const hermesConfig = readHermesConfig()
  const openCodeConfig = readOpenCodeConfig()
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
  let sourceExisting: any = {}
  if (fs.existsSync(sourcePaths.configFile)) {
    try { sourceExisting = JSON.parse(fs.readFileSync(sourcePaths.configFile, 'utf-8')) } catch {}
  }
  const sourceSkills = Array.isArray(sourceExisting.skills?.paths) ? sourceExisting.skills.paths : []
  const sourceModel = typeof sourceExisting.model === 'string' ? sourceExisting.model : undefined

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
      let merged = { ...existing, ...parsed }
      merged = mergeSkillsConfig(agent, merged, sourceSkills)
      if (agent === 'claude') merged = mergeClaudeModelConfig(merged, sourceModel)
      if (agent === 'claude') merged = mergeClaudeFromHermes(merged, hermesConfig, sourceModel)
      if (agent === 'claude') merged = mergeClaudeFromOpenCode(merged, openCodeConfig, sourceModel)
      if (agent === 'opencode') merged = mergeOpenCodeProviders(merged, hermesConfig)
      fs.writeFileSync(paths.configFile, JSON.stringify(merged, null, 2))

      for (const extraFile of paths.extraConfigFiles || []) {
        const extraDir = path.dirname(extraFile)
        if (!fs.existsSync(extraDir)) fs.mkdirSync(extraDir, { recursive: true })
        let extraExisting: any = {}
        if (fs.existsSync(extraFile)) {
          try { extraExisting = JSON.parse(fs.readFileSync(extraFile, 'utf-8')) } catch {}
        }
        let extraMerged = { ...extraExisting, ...parsed }
        extraMerged = mergeSkillsConfig(agent, extraMerged, sourceSkills)
        if (agent === 'claude') extraMerged = mergeClaudeModelConfig(extraMerged, sourceModel)
        if (agent === 'claude') extraMerged = mergeClaudeFromHermes(extraMerged, hermesConfig, sourceModel)
        if (agent === 'claude') extraMerged = mergeClaudeFromOpenCode(extraMerged, openCodeConfig, sourceModel)
        if (agent === 'opencode') extraMerged = mergeOpenCodeProviders(extraMerged, hermesConfig)
        fs.writeFileSync(extraFile, JSON.stringify(extraMerged, null, 2))
      }
    }

    console.log(chalk.green(`  ✔ ${paths.example}: ${mcpCount} MCP → ${paths.configFile}`))

    if ((useLink || agent === 'claude') && agent !== sourceAgent && fs.existsSync(sourcePaths.skillDir)) {
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
