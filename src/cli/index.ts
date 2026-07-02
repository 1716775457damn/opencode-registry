#!/usr/bin/env node
import { Command } from 'commander'
import { RegistryStorage } from '../core/storage.js'
import { Scanner } from '../core/scanner.js'
import { scanCommand } from './commands/scan.js'
import { listCommand } from './commands/list.js'
import { searchCommand } from './commands/search.js'
import { infoCommand } from './commands/info.js'
import { statsCommand } from './commands/stats.js'
import { exportCommand } from './commands/export.js'
import { enableCommand } from './commands/enable.js'
import { importCommand } from './commands/import.js'
import { installCommand } from './commands/install.js'
import { syncCommand } from './commands/sync.js'

const program = new Command()

program
  .name('oreg')
  .description('OpenCode Registry — Skills & MCP 标准化管理工具')
  .version('0.1.0')

program
  .command('scan')
  .description('扫描当前 OpenCode 配置，构建注册索引')
  .option('-c, --config <path>', 'opencode.json 路径')
  .action(async (opts) => {
    const storage = new RegistryStorage()
    const scannerCfg = opts.config ? { opencodeConfigPath: opts.config } : undefined
    const scanner = new Scanner(storage, scannerCfg)
    await scanCommand(scanner)
    storage.close()
  })

program
  .command('list')
  .description('列出注册中心中的项目')
  .argument('[type]', '类型: skill|mcp|command|agent', 'skill')
  .option('-c, --category <cat>', '按分类筛选（skills）')
  .option('-g, --group <group>', '按分组筛选（MCP）')
  .option('-s, --scope <scope>', '按作用域筛选')
  .option('--enabled', '仅显示已启用的')
  .option('--disabled', '仅显示已禁用的')
  .option('--json', 'JSON 格式输出')
  .action((type, opts) => {
    const storage = new RegistryStorage()
    listCommand(storage, type, opts)
    storage.close()
  })

program
  .command('search')
  .description('搜索技能/MCP/命令')
  .argument('<query>', '搜索关键词')
  .option('-t, --type <kind>', '限定类型: skill|mcp|command|agent')
  .option('--json', 'JSON 格式输出')
  .action((query, opts) => {
    const storage = new RegistryStorage()
    searchCommand(storage, query, opts)
    storage.close()
  })

program
  .command('info')
  .description('查看项目详情')
  .argument('<type>', '类型: skill|mcp|command|agent')
  .argument('<name>', '项目名称')
  .option('--json', 'JSON 格式输出')
  .action((type, name, opts) => {
    const storage = new RegistryStorage()
    infoCommand(storage, type, name, opts)
    storage.close()
  })

program
  .command('stats')
  .description('查看注册中心统计信息')
  .option('--json', 'JSON 格式输出')
  .action((opts) => {
    const storage = new RegistryStorage()
    statsCommand(storage, opts)
    storage.close()
  })

program
  .command('import')
  .description('导入注册数据')
  .argument('<source>', 'JSON 文件路径 或 技能目录')
  .option('--dry-run', '预览导入内容')
  .option('-f, --format <format>', '导入格式: json|dir', 'json')
  .action(async (source, opts) => {
    const storage = new RegistryStorage()
    await importCommand(storage, source, opts)
    storage.close()
  })

program
  .command('install')
  .description('从导出包一键安装到本机（多 Agent + 多平台）')
  .argument('<source>', '导出目录路径')
  .option('--agent <agents>', `目标 Agent (逗号分隔): opencode,claude,cursor,codex,windsurf`, 'opencode')
  .option('--dry-run', '预览安装内容，不做实际写入')
  .action(async (source, opts) => {
    await installCommand(source, opts)
  })

program
  .command('export')
  .description('导出注册数据（含源文件，按分类组织）')
  .option('-o, --output <path>', '输出路径', './registry-export')
  .option('-t, --types <types>', '导出类型 (逗号分隔): skill,mcp,command,agent', 'skill,mcp,command,agent')
  .option('-f, --format <format>', '导出格式: dir|zip|json', 'dir')
  .action(async (opts) => {
    const storage = new RegistryStorage()
    await exportCommand(storage, opts)
    storage.close()
  })

program
  .command('enable')
  .description('启用/禁用项目')
  .argument('<type>', '类型: skill|mcp|command|agent')
  .argument('<name>', '项目名称')
  .option('--off', '禁用而非启用')
  .action((type, name, opts) => {
    const storage = new RegistryStorage()
    enableCommand(storage, type, name, opts)
    storage.close()
  })

program
  .command('sync')
  .description('同步配置到多 Agent (OpenCode/Claude/Cursor/Codex/Windsurf)')
  .option('--agent <agents>', `目标 Agent (逗号分隔): opencode,claude,cursor,codex,windsurf`, 'opencode')
  .action((opts) => {
    const storage = new RegistryStorage()
    syncCommand(storage, opts)
    storage.close()
  })

program.parse(process.argv)
