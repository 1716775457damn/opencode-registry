import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { createHash } from 'crypto'
import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { RegistryRecord, SkillRecord, MCPServerRecord, CommandRecord, AgentRecord } from '../../core/types.js'

const GIT_URL_RE = /^(https?:\/\/|git@|ssh:\/\/).+\.git$|^https?:\/\/github\.com\//i

function isGitURL(s: string) { return GIT_URL_RE.test(s.trim()) }

function isSkill(r: any): r is SkillRecord { return r.kind === 'skill' }
function isMCP(r: any): r is MCPServerRecord { return r.kind === 'mcp' }
function isCommand(r: any): r is CommandRecord { return r.kind === 'command' }
function isAgent(r: any): r is AgentRecord { return r.kind === 'agent' }

export async function importCommand(storage: RegistryStorage, source: string, opts: any) {
  const { dryRun, format } = opts

  if (isGitURL(source) || format === 'git') {
    await importGit(storage, source, dryRun)
    return
  }

  if (format === 'json' || source.endsWith('.json')) {
    await importJSON(storage, source, dryRun)
    return
  }

  if (format === 'dir' || (fs.existsSync(source) && fs.statSync(source).isDirectory())) {
    await importDir(storage, source, dryRun)
    return
  }

  console.log(chalk.red(`Unknown import source: ${source}`))
}

async function importGit(storage: RegistryStorage, url: string, dryRun?: boolean) {
  const tmpDir = `/tmp/oreg-import-${Date.now()}`
  console.log(chalk.cyan(`📦 克隆 ${url}...`))
  try {
    execSync(`git clone --depth 1 "${url}" "${tmpDir}"`, { stdio: 'pipe', timeout: 60000 })
  } catch (e: any) {
    console.log(chalk.red(`Git clone 失败: ${e.message}`))
    cleanup(tmpDir)
    return
  }
  const repoName = fs.readdirSync(tmpDir).find(e => fs.statSync(path.join(tmpDir, e)).isDirectory()) || 'repo'
  const skillDir = path.join(tmpDir, repoName, 'skills')
  const target = fs.existsSync(skillDir) ? skillDir : tmpDir
  await importDir(storage, target, dryRun)
  cleanup(tmpDir)
}

function cleanup(dir: string) {
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
}

async function importJSON(storage: RegistryStorage, filePath: string, dryRun?: boolean) {
  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`File not found: ${filePath}`))
    return
  }

  let data: any
  try { data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch {
    console.log(chalk.red('Invalid JSON file'))
    return
  }

  const records: RegistryRecord[] = data.records || data || []
  if (!Array.isArray(records)) {
    console.log(chalk.red('Expected an array of records or { records: [...] }'))
    return
  }

  let imported = 0, skipped = 0

  for (const r of records) {
    try {
      if (dryRun) {
        console.log(chalk.dim(`  [dry-run] would import ${r.kind}: ${r.name}`))
        imported++
        continue
      }

      if (isSkill(r)) {
        const res = storage.upsertSkill(r)
        if (res.action === 'created') imported++; else skipped++
      } else if (isMCP(r)) {
        const res = storage.upsertMCPServer(r)
        if (res.action === 'created') imported++; else skipped++
      } else if (isCommand(r)) {
        const res = storage.upsertCommand(r)
        if (res.action === 'created') imported++; else skipped++
      } else if (isAgent(r)) {
        const res = storage.upsertAgent(r)
        if (res.action === 'created') imported++; else skipped++
      }
    } catch (e: any) {
      console.log(chalk.red(`  Error importing ${r.kind}/${r.name}: ${e.message}`))
    }
  }

  const total = records.length
  console.log(chalk.green(`\n✔ 导入完成 (${imported} new, ${skipped} updated, ${total} total)`))
}

async function importDir(storage: RegistryStorage, dirPath: string, dryRun?: boolean) {
  if (!fs.existsSync(dirPath)) {
    console.log(chalk.red(`Directory not found: ${dirPath}`))
    return
  }

  let imported = 0
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillPath = path.join(dirPath, entry.name, 'SKILL.md')
    if (!fs.existsSync(skillPath)) continue

    const content = fs.readFileSync(skillPath, 'utf-8')
    const checksum = createHash('sha256').update(content).digest('hex').slice(0, 16)
    const stats = fs.statSync(skillPath)
    const refDir = path.join(dirPath, entry.name, 'references')
    const refFiles = fs.existsSync(refDir) ? fs.readdirSync(refDir) : []

    const record: SkillRecord = {
      kind: 'skill', id: `skill_${entry.name}`,
      name: entry.name, version: '1.0.0',
      description: entry.name,
      category: 'imported',
      tags: [],
      source: 'local', sourceUrl: '',
      filePath: skillPath, checksum, fileSize: stats.size,
      mcpDependencies: [], referenceFiles: refFiles,
      scope: 'opencode', enabled: true,
      createdAt: '', updatedAt: ''
    }

    if (dryRun) {
      console.log(chalk.dim(`  [dry-run] would import skill: ${entry.name}`))
    } else {
      storage.upsertSkill(record)
      console.log(chalk.green(`  ✔ imported: ${entry.name}`))
    }
    imported++
  }

  console.log(chalk.green(`\n✔ 从目录导入 ${imported} 个技能`))
}
