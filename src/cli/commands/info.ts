import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind } from '../../core/types.js'

export function infoCommand(storage: RegistryStorage, type: string, name: string, opts: any) {
  const kind = type as ItemKind
  let record: any

  switch (kind) {
    case 'skill': record = storage.getSkill(name); break
    case 'mcp': record = storage.getMCPServer(name); break
    default: console.log(chalk.red(`info 暂不支持 ${type}`)); return
  }

  if (!record) {
    console.log(chalk.yellow(`未找到 ${type} "${name}"`))
    return
  }

  if (opts.json) return console.log(JSON.stringify(record, null, 2))

  console.log(chalk.cyan(`\n${record.kind === 'skill' ? '📦' : '🔌'} ${record.name}`))
  console.log(chalk.dim(`  ID: ${record.id}`))
  console.log(`  描述: ${record.description || '(无)'}`)
  console.log(`  版本: ${record.version}`)
  console.log(`  状态: ${record.enabled ? chalk.green('启用') : chalk.red('禁用')}`)
  console.log(`  来源: ${record.source}`)
  console.log(`  Tag: ${record.tags.join(', ') || '(无)'}`)

  if (record.kind === 'skill') {
    console.log(`  分类: ${record.category}`)
    console.log(`  路径: ${record.filePath}`)
    console.log(`  大小: ${record.fileSize} bytes`)
    console.log(`  校验: ${record.checksum}`)
    console.log(`  范围: ${record.scope}`)
    console.log(`  引用文件: ${record.referenceFiles.length} 个`)
  } else if (record.kind === 'mcp') {
    console.log(`  命令: ${record.command} ${record.args.join(' ')}`)
    console.log(`  传输: ${record.transport}`)
    console.log(`  懒加载: ${record.lazyLoad ? '是' : '否'}`)
    console.log(`  分组: ${record.groups.join(', ') || '(无)'}`)
    const envKeys = Object.keys(record.env)
    console.log(`  环境变量: ${envKeys.length > 0 ? envKeys.join(', ') : '(无)'}`)
  }
  console.log()
}
