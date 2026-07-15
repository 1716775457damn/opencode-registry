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
import { checkCommand } from './commands/check.js'
import { linkCommand } from './commands/link.js'
import { syncCommand } from './commands/sync.js'
import { aiContextCommand } from './commands/ai-context.js'
import { recommendCommand } from './commands/recommend.js'
import { switchCommand } from './commands/switch.js'

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
  .command('ai-context')
  .description('输出 AI 可直接消费的注册中心上下文快照')
  .option('-q, --query <query>', '按任务/关键词筛选上下文记录')
  .option('-t, --type <kind>', '限定类型: skill|mcp|command|agent')
  .option('-l, --limit <n>', '记录数量上限', '20')
  .option('-o, --output <path>', '写入 JSON 文件')
  .option('--no-records', '只输出统计/路径/工具说明，不包含记录列表')
  .option('--json', 'JSON 格式输出')
  .action((opts) => {
    const storage = new RegistryStorage()
    aiContextCommand(storage, opts)
    storage.close()
  })

program
  .command('recommend')
  .description('根据自然语言任务推荐可用 Skill/MCP/Agent')
  .argument('<task>', '任务描述')
  .option('-t, --type <kind>', '限定类型: skill|mcp|command|agent')
  .option('-l, --limit <n>', '推荐数量上限', '10')
  .option('--json', 'JSON 格式输出')
  .action((task, opts) => {
    const storage = new RegistryStorage()
    recommendCommand(storage, task, opts)
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
  .command('check')
  .description('检查冲突：重复技能、MCP 冲突、配置漂移、Hermes 兼容性')
  .action(() => {
    const storage = new RegistryStorage()
    checkCommand(storage)
    storage.close()
  })

program
  .command('link')
  .description('用 symlink 共享技能目录（单真相源，多 Agent 指向同一份）')
  .argument('<source-agent>', '源 Agent: opencode|claude|cursor|codex|windsurf')
  .option('-t, --target <agents>', '目标 Agent (逗号分隔)，默认全部')
  .option('--force', '覆盖冲突的真实目录')
  .option('--dry-run', '预览')
  .action((source, opts) => {
    linkCommand(source, opts)
  })

program
  .command('sync')
  .description('同步配置到多 Agent (OpenCode/Claude/Cursor/Codex/Windsurf)')
  .option('--agent <agents>', `目标 Agent (逗号分隔): opencode,claude,cursor,codex,windsurf`, 'opencode')
  .option('--link', '同步时用 symlink 共享技能文件（不用拷贝）')
  .action((opts) => {
    const storage = new RegistryStorage()
    syncCommand(storage, opts)
    storage.close()
  })

program
  .command('switch')
  .description('Claude 模型一键切换（类似 CC Switch）')
  .argument('[model]', '模型名称（如: gpt-5.5, claude-sonnet-4-6, qwen3-64b）')
  .option('-l, --list', '列出所有可用模型')
  .option('-c, --current', '查看当前配置')
  .option('-r, --reset', '重置为默认 Claude 模型')
  .option('--dry-run', '预览修改，不实际写入文件')
  .action((model, opts) => {
    const storage = new RegistryStorage()
    switchCommand(storage, { model, ...opts })
    storage.close()
  })

program.parse(process.argv)
