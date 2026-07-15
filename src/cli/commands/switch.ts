import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { detectOS, getAgentPaths, type OSType } from '../../core/platform.js'

const MAPPING_PATH = path.join(process.cwd(), 'claude-model-map.json')

interface ModelConfig {
  model: string
  env?: Record<string, string>
  maxTokens?: number
  permissions?: Record<string, string[]>
  description?: string
}

interface MappingConfig {
  default: ModelConfig
  sourceModelMap: Record<string, ModelConfig>
}

function readMapping(): MappingConfig {
  try {
    if (!fs.existsSync(MAPPING_PATH)) {
      return {
        default: { model: 'claude-sonnet-4-6' },
        sourceModelMap: {}
      }
    }
    return JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8')) as MappingConfig
  } catch (e) {
    return { default: { model: 'claude-sonnet-4-6' }, sourceModelMap: {} }
  }
}

function writeMapping(config: MappingConfig): void {
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(config, null, 2))
}

function readClaudeConfig(osType: OSType): any {
  const paths = getAgentPaths('claude', osType)
  try {
    if (!fs.existsSync(paths.configFile)) return {}
    return JSON.parse(fs.readFileSync(paths.configFile, 'utf-8'))
  } catch (e) {
    return {}
  }
}

function writeClaudeConfig(osType: OSType, config: any): string {
  const paths = getAgentPaths('claude', osType)
  const configDir = path.dirname(paths.configFile)
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
  fs.writeFileSync(paths.configFile, JSON.stringify(config, null, 2))
  return paths.configFile
}

function listAvailable(mapping: MappingConfig): void {
  const builtin = [
    { key: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', desc: '官方 Claude 模型（需 ANTHROPIC_API_KEY）' },
    { key: 'gpt-5.5', name: 'GPT-5.5', desc: 'OpenAI GPT-5.5（兼容 OpenAI 协议中转）' },
    { key: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', desc: 'OpenAI GPT-4.5 Preview' },
    { key: 'qwen3-64b', name: 'Qwen3 64B', desc: '阿里云通义千问 3.0 64B' },
    { key: 'deepseek-v3', name: 'DeepSeek V3', desc: '深度求索 DeepSeek V3' },
  ]

  console.log(chalk.cyan('📋 可用模型列表'))
  console.log()
  for (const m of builtin) {
    const mapped = mapping.sourceModelMap[m.key]
    const flag = mapped ? chalk.green('✓') : chalk.dim('-')
    console.log(`  ${flag} ${chalk.bold(m.key)}`)
    console.log(`       ${m.name}`)
    console.log(`       ${chalk.dim(m.desc)}`)
    if (mapped?.env?.ANTHROPIC_BASE_URL) {
      console.log(`       ${chalk.cyan(`→ ${mapped.env.ANTHROPIC_BASE_URL}`)}`)
    }
  }
  console.log()
  console.log(chalk.dim('  自定义映射请修改 claude-model-map.json 后使用'))
}

function showCurrent(osType: OSType, mapping: MappingConfig): void {
  const config = readClaudeConfig(osType)
  const current = config.model || '(未设置)'
  const currentEnv = config.env || {}

  console.log(chalk.cyan('🎯 当前 Claude 模型配置'))
  console.log()
  console.log(`  模型: ${chalk.bold(current)}`)
  if (currentEnv.ANTHROPIC_BASE_URL) {
    console.log(`  地址: ${chalk.cyan(currentEnv.ANTHROPIC_BASE_URL)}`)
  }
  if (config.maxTokens) {
    console.log(`  最大 Token: ${chalk.yellow(config.maxTokens)}`)
  }
  if (currentEnv.HERMES_SOURCE_MODEL) {
    console.log(`  来源模型: ${chalk.dim(currentEnv.HERMES_SOURCE_MODEL)}`)
  }
  if (currentEnv.OPENCODE_SOURCE_MODEL) {
    console.log(`  来源模型: ${chalk.dim(currentEnv.OPENCODE_SOURCE_MODEL)}`)
  }
}

function switchModel(osType: OSType, modelKey: string, mapping: MappingConfig, dryRun: boolean): void {
  const config = readClaudeConfig(osType)
  const selectedConfig = mapping.sourceModelMap[modelKey] || mapping.default

  const newConfig = {
    ...config,
    model: selectedConfig.model,
    env: {
      ...(config.env || {}),
      ...(selectedConfig.env || {}),
    },
    maxTokens: selectedConfig.maxTokens || config.maxTokens || 8192,
    permissions: selectedConfig.permissions || config.permissions || { allow: ['Bash', 'Edit', 'Read', 'Write', 'Glob', 'Grep'] },
  }

  if (!dryRun) {
    const writtenPath = writeClaudeConfig(osType, newConfig)
    console.log(chalk.green(`✔ 已切换到 ${chalk.bold(modelKey)}`))
    console.log(chalk.dim(`  配置文件: ${writtenPath}`))
    if (selectedConfig.env?.ANTHROPIC_BASE_URL) {
      console.log(chalk.cyan(`  地址: ${selectedConfig.env.ANTHROPIC_BASE_URL}`))
    }
  } else {
    console.log(chalk.yellow(`[dry-run] 将切换到 ${chalk.bold(modelKey)}`))
    console.log(chalk.dim(`  模型: ${selectedConfig.model}`))
    if (selectedConfig.env?.ANTHROPIC_BASE_URL) {
      console.log(chalk.dim(`  地址: ${selectedConfig.env.ANTHROPIC_BASE_URL}`))
    }
  }
}

export function switchCommand(storage: RegistryStorage, args: any): void {
  const osType = detectOS()
  const mapping = readMapping()

  if (args.list || args.l) {
    listAvailable(mapping)
    return
  }

  if (args.current || args.c) {
    showCurrent(osType, mapping)
    return
  }

  if (args.reset || args.r) {
    switchModel(osType, 'default', mapping, args.dryRun)
    return
  }

  const modelArg = args.model || args.m || args._?.[0]
  if (modelArg) {
    switchModel(osType, String(modelArg), mapping, args.dryRun)
    return
  }

  console.log(chalk.cyan('🔄 Claude 模型一键切换工具'))
  console.log()
  console.log(chalk.bold('用法:'))
  console.log('  oreg switch <模型名>       切换到指定模型')
  console.log('  oreg switch --list         列出所有可用模型')
  console.log('  oreg switch --current      查看当前配置')
  console.log('  oreg switch --reset        重置为默认 Claude 模型')
  console.log()
  console.log(chalk.bold('示例:'))
  console.log('  oreg switch gpt-5.5')
  console.log('  oreg switch claude-sonnet-4-6')
  console.log('  oreg switch qwen3-64b')
  console.log()
  console.log(chalk.dim('所有模型使用兼容 OpenAI 协议的中转地址'))
  console.log(chalk.dim('中转地址和 API Key 请在 claude-model-map.json 中配置'))
}