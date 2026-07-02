import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import { Scanner } from '../../core/scanner.js'

function home(...parts: string[]) {
  return path.join(process.env.HOME || '/tmp', ...parts)
}

function opencodeDir() {
  return process.env.OPENCODE_CONFIG_DIR || home('.config', 'opencode')
}

export async function installCommand(source: string, opts: any) {
  const prefix = opts.prefix || opencodeDir()
  const dryRun = !!opts.dryRun

  const manifestPath = path.join(source, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.log(chalk.red(`✖ 未找到 ${manifestPath}，请确保导出目录包含 manifest.json`))
    return
  }

  let manifest: any
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) } catch {
    console.log(chalk.red('✖ manifest.json 解析失败'))
    return
  }

  console.log(chalk.cyan(`📦 安装导出包到 ${prefix}`))
  console.log(chalk.dim(`  总计 ${manifest.summary.total} 条记录`))
  if (dryRun) console.log(chalk.yellow('  [DRY RUN] 仅预览，不做实际写入'))
  console.log()

  const skillDir = path.join(prefix, 'skills')
  const configPath = path.join(prefix, 'opencode.json')

  let installed = 0, skipped = 0

  // Step 1: Install skills (copy SKILL.md + references/)
  const skillsSrc = path.join(source, 'skills')
  if (fs.existsSync(skillsSrc)) {
    if (!dryRun && !fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true })
    }
    const categories = fs.readdirSync(skillsSrc)
    let skillCount = 0
    for (const cat of categories) {
      const catDir = path.join(skillsSrc, cat)
      if (!fs.statSync(catDir).isDirectory()) continue
      const skillNames = fs.readdirSync(catDir)
      for (const name of skillNames) {
        const skillSrcDir = path.join(catDir, name)
        if (!fs.statSync(skillSrcDir).isDirectory()) continue
        const skillDestDir = path.join(skillDir, name)

        if (dryRun) {
          const hasRefs = fs.existsSync(path.join(skillSrcDir, 'references'))
          console.log(chalk.dim(`  [dry-run] 安装 skill ${cat}/${name}${hasRefs ? ' + refs' : ''}`))
          skillCount++
          continue
        }

        if (fs.existsSync(skillDestDir)) {
          console.log(chalk.yellow(`  ⚠  已存在，覆盖: ${name}`))
          fs.rmSync(skillDestDir, { recursive: true, force: true })
        }
        fs.cpSync(skillSrcDir, skillDestDir, { recursive: true })
        skillCount++
      }
    }
    if (!dryRun) {
      console.log(chalk.green(`  ✔ 已安装 ${skillCount} 个技能到 ${skillDir}`))
      installed += skillCount
    } else {
      console.log(chalk.dim(`  [dry-run] 将安装 ${skillCount} 个技能`))
    }
  }

  // Step 2: Install MCP servers (merge into opencode.json)
  const mcpSrc = path.join(source, 'mcp-servers')
  if (fs.existsSync(mcpSrc)) {
    let mcpConfig: Record<string, any> = {}
    if (!dryRun && fs.existsSync(configPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        mcpConfig = existing.mcp || existing.mcpServers || {}
      } catch {}
    }

    let mcpCount = 0
    const groups = fs.readdirSync(mcpSrc)
    for (const group of groups) {
      const groupDir = path.join(mcpSrc, group)
      if (!fs.statSync(groupDir).isDirectory()) continue
      const files = fs.readdirSync(groupDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const mcpData = JSON.parse(fs.readFileSync(path.join(groupDir, file), 'utf-8'))
        const name = mcpData.name

        if (dryRun) {
          const exists = mcpConfig[name] ? ' (已存在)' : ''
          console.log(chalk.dim(`  [dry-run] 注册 MCP ${group}/${name}${exists}`))
          mcpCount++
          continue
        }

        mcpConfig[name] = {
          type: 'local',
          command: mcpData.command,
          args: mcpData.args,
          enabled: mcpData.enabled !== false,
          groups: [group],
          description: mcpData.description || `${name} MCP server`,
        }
        mcpCount++
      }
    }

    if (!dryRun) {
      let config: any = {}
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      }
      config.mcp = mcpConfig
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
      console.log(chalk.green(`  ✔ 已注册 ${mcpCount} 个 MCP 服务器到 opencode.json`))
      installed += mcpCount
    } else {
      console.log(chalk.dim(`  [dry-run] 将注册 ${mcpCount} 个 MCP 服务器`))
    }
  }

  // Step 3: Copy registry.db
  const dbSrc = path.join(source, 'registry.db')
  if (fs.existsSync(dbSrc) && !dryRun) {
    const dbDest = path.join(prefix, 'registry.db')
    fs.cpSync(dbSrc, dbDest)
    console.log(chalk.green(`  ✔ 已复制 registry.db (${(fs.statSync(dbSrc).size / 1024).toFixed(0)} KB)`))
  }

  // Step 4: Run scan to index
  if (!dryRun) {
    console.log()
    console.log(chalk.cyan('🔍 扫描本地配置...'))
    const storage = new RegistryStorage()
    const scanner = new Scanner(storage, { opencodeConfigPath: configPath })
    const result = await scanner.scanAll()
    console.log(chalk.green(`  ✔ 扫描完成: ${result.newRecords} new, ${result.updatedRecords} updated`))
    storage.close()
  }

  console.log()
  if (dryRun) {
    console.log(chalk.yellow('这是预览模式。去掉 --dry-run 执行实际安装。'))
  } else {
    console.log(chalk.green(`✅ 安装完成。使用 oreg stats 查看详情，oreg list skill 浏览技能。`))
  }
}
