import fs from 'fs'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { MCPServerRecord } from '../../core/types.js'

function home(...parts: string[]) {
  return path.join(process.env.HOME || '/tmp', ...parts)
}
import path from 'path'

export function syncCommand(storage: RegistryStorage, opts: any) {
  const configPath = process.env.OPENCODE_CONFIG_PATH || home('.config', 'opencode', 'opencode.json')

  if (!fs.existsSync(configPath)) {
    console.log(chalk.red(`Config not found: ${configPath}`))
    return
  }

  let config: any
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) } catch {
    console.log(chalk.red('Failed to parse opencode.json'))
    return
  }

  const mcpServers = storage.listMCPServers()
  const configMcp = config.mcp || {}
  let changes = 0

  for (const m of mcpServers) {
    const entry = configMcp[m.name]
    if (!entry) continue

    const currentEnabled = entry.enabled !== false
    const desiredEnabled = m.enabled

    if (currentEnabled !== desiredEnabled) {
      entry.enabled = desiredEnabled
      console.log(chalk[m.enabled ? 'green' : 'yellow'](
        `  ${m.enabled ? '✔ 启用' : '✖ 禁用'} MCP: ${m.name}`
      ))
      changes++
    }
  }

  if (changes === 0) {
    console.log(chalk.dim('  无变更'))
  }

  config.mcp = configMcp
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  console.log(chalk.green(`\n✔ 已同步 ${changes} 个 MCP 服务器状态到 ${configPath}`))

  const targets = (opts.target || '').split(',').map((t: string) => t.trim()).filter(Boolean)
  if (targets.length > 0) {
    for (const t of targets) {
      writeCrossToolConfig(config, t.trim(), mcpServers)
    }
  }
}

function writeCrossToolConfig(sourceConfig: any, tool: string, mcps: MCPServerRecord[]) {
  const enabledMcps = mcps.filter(m => m.enabled)

  switch (tool) {
    case 'cursor': {
      const cursorPath = home('.config', 'cursor', 'mcp.json')
      const cursorConfig: any = { mcpServers: {} }
      for (const m of enabledMcps) {
        cursorConfig.mcpServers[m.name] = {
          command: m.command,
          args: m.args.length > 0 ? m.args : undefined,
          env: Object.keys(m.env).length > 0 ? m.env : undefined,
        }
      }
      const dir = path.dirname(cursorPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(cursorPath, JSON.stringify(cursorConfig, null, 2))
      console.log(chalk.green(`  ✔ 已写入 ${tool} 配置 (${Object.keys(cursorConfig.mcpServers).length} MCP)`))
      break
    }

    case 'codex': {
      const codexPath = home('.config', 'codex', 'config.toml')
      let toml = '[mcp_servers]\n'
      for (const m of enabledMcps) {
        toml += `"${m.name}" = { command = "${m.command}", args = ${JSON.stringify(m.args)} }\n`
      }
      const dir = path.dirname(codexPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(codexPath, toml)
      console.log(chalk.green(`  ✔ 已写入 ${tool} 配置 (${enabledMcps.length} MCP)`))
      break
    }

    default:
      console.log(chalk.yellow(`  未知目标工具: ${tool} (支持: cursor, codex)`))
  }
}
