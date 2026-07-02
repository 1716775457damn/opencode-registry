import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { detectOS, getAgentPaths } from '../../core/platform.js'
import type { AgentType } from '../../core/platform.js'

const ALL_AGENTS: AgentType[] = ['opencode', 'claude', 'cursor', 'codex', 'windsurf']

export function linkCommand(sourceAgent: string, opts: any) {
  const osType = detectOS()
  const dryRun = !!opts.dryRun

  if (!ALL_AGENTS.includes(sourceAgent as AgentType)) {
    console.log(chalk.red(`✖ 无效 source agent: ${sourceAgent}`))
    return
  }

  const targets: AgentType[] = opts.target
    ? (opts.target as string).split(',').map((t: string) => t.trim()).filter(t => ALL_AGENTS.includes(t as AgentType)) as AgentType[]
    : ALL_AGENTS.filter(a => a !== sourceAgent)

  const sourcePaths = getAgentPaths(sourceAgent as AgentType)
  const sourceSkillDir = sourcePaths.skillDir

  if (!fs.existsSync(sourceSkillDir)) {
    console.log(chalk.red(`✖ 源技能目录不存在: ${sourceSkillDir}`))
    return
  }

  console.log(chalk.cyan(`🔗 技能链接配置`))
  console.log(chalk.dim(`  源: ${sourceAgent} → ${sourceSkillDir}`))
  console.log(chalk.dim(`  目标: ${targets.join(', ')}`))
  if (dryRun) console.log(chalk.yellow('  [DRY RUN]'))
  console.log()

  const skills = fs.readdirSync(sourceSkillDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(sourceSkillDir, e.name, 'SKILL.md')))
    .map(e => e.name)

  let totalLinked = 0

  for (const target of targets) {
    const targetPaths = getAgentPaths(target)
    const targetDir = targetPaths.skillDir

    if (targetDir === sourceSkillDir) {
      console.log(chalk.dim(`  ${target}: 与源相同，跳过`))
      continue
    }

    if (!dryRun && !fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    let linked = 0, skipped = 0, conflicted = 0
    const log: string[] = []

    for (const name of skills) {
      const linkPath = path.join(targetDir, name)
      const sourcePath = path.join(sourceSkillDir, name)

      if (dryRun) {
        if (fs.existsSync(linkPath)) {
          if (fs.lstatSync(linkPath).isSymbolicLink()) {
            const realTarget = fs.readlinkSync(linkPath)
            if (realTarget === sourcePath) {
              skipped++
              continue
            }
          }
          log.push(chalk.dim(`    [dry-run] 替换 ${target}/${name} (已存在)`))
        } else {
          log.push(chalk.dim(`    [dry-run] 链接 ${target}/${name}`))
        }
        linked++
        continue
      }

      if (fs.existsSync(linkPath)) {
        if (fs.lstatSync(linkPath).isSymbolicLink()) {
          const realTarget = fs.readlinkSync(linkPath)
          if (realTarget === sourcePath) {
            skipped++
            continue
          }
          fs.unlinkSync(linkPath)
          log.push(chalk.yellow(`  ⚠  更新链接: ${name}`))
        } else {
          if (opts.force) {
            fs.rmSync(linkPath, { recursive: true, force: true })
            log.push(chalk.yellow(`  ⚠  覆盖已有目录: ${name}`))
          } else {
            conflicted++
            log.push(chalk.red(`  ✖  冲突: ${name} (真实目录，使用 --force 覆盖)`))
            continue
          }
        }
      }

      try {
        fs.symlinkSync(sourcePath, linkPath, 'dir')
        linked++
      } catch (e: any) {
        log.push(chalk.red(`  ✖  链接失败: ${name} (${e.message})`))
      }
    }

    for (const l of log) console.log(l)
    console.log(chalk.green(`  ✔ ${target}: ${linked} linked, ${skipped} skipped, ${conflicted} conflicts`))
    totalLinked += linked
  }

  if (!dryRun && totalLinked > 0) {
    console.log(chalk.green(`\n🔗 总计创建 ${totalLinked} 个 symlink`))
    console.log(chalk.cyan('\n💡 建议运行 oreg check 验证一致性'))
  }

  if (!dryRun) {
    console.log(chalk.cyan('\n📌 多 Agent 共存策略:'))
    console.log(chalk.dim('  技能文件仅存储在 ' + sourceAgent + ' 目录'))
    console.log(chalk.dim('  其他 Agent 通过 symlink 指向同一份文件'))
    console.log(chalk.dim('  新增技能: 放入源目录即可，所有 Agent 自动可见'))
    console.log(chalk.dim('  MCP 配置: 运行 oreg sync --agent all 统一更新'))
  }
}
