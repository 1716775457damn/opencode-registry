# OpenCode Registry

**Skills & MCP 标准化管理 + 模型一键切换工具** — 扫描、搜索、导入导出、统一管理所有技能/MCP/Agent，并提供 CC Switch 风格的 Claude 模型一键切换能力。

[![GitHub](https://img.shields.io/badge/GitHub-1716775457damn%2Fopencode--registry-blue)](https://github.com/1716775457damn/opencode-registry)

## 功能速览

| 功能 | CLI | MCP | 说明 |
|------|-----|-----|------|
| 扫描重建索引 | `oreg scan` | — | 扫描 OpenCode 配置构建注册中心 |
| 统计概览 | `oreg stats` | `registry_stats` | 各类型数量统计 |
| 全文搜索 | `oreg search <q>` | `registry_search` | 按关键词搜索 Skill/MCP/Agent |
| 分类列出 | `oreg list <type>` | `registry_list_*` | 按类型/分类/分组浏览 |
| 详情查看 | `oreg info <type> <name>` | `registry_get_*` | 查看具体项的完整信息 |
| 导出数据 | `oreg export` | `registry_export_json` | 导出注册数据为 JSON |
| **AI 上下文快照** | `oreg ai-context` | `registry_ai_context` | **AI 可直接消费的紧凑上下文** |
| **任务推荐** | `oreg recommend` | `registry_recommend` | **按自然语言任务推荐 Skill/MCP** |
| 导入数据 | `oreg import <src>` | — | 导入 JSON/Git 仓库/本地目录 |
| 启用/禁用 | `oreg enable/disable` | — | 开关具体 Skill/MCP/Agent |
| 冲突检查 | `oreg check` | — | 检查重复、配置漂移、兼容性 |
| 多 Agent 同步 | `oreg sync` | — | 同步到 Claude/Cursor/Codex/Windsurf |
| **模型一键切换** | `oreg switch` | — | **类似 CC Switch 的模型切换** |
| 技能目录共享 | `oreg link` | — | symlink 多 Agent 共享技能目录 |

## 快速开始

```bash
# 安装构建
cd /mnt/d/ai-outputs/opencode-registry
npm install && npm run build

# 全局安装 CLI（可选，之后可直接运行 oreg）
npm link

# 1. 第一次扫描
oreg scan

# 2. 查看统计
oreg stats

# 3. 搜索
oreg search database
oreg search playwright --type skill

# 4. AI 直接使用：获取上下文 + 任务推荐
oreg ai-context --json
oreg ai-context --query "browser automation" --json
oreg recommend "我要做浏览器自动化测试" --json

# 5. 一键切换模型（类似 CC Switch）
oreg switch --list             # 查看可用模型
oreg switch gpt-5.5            # 切换到 GPT-5.5
oreg switch --current          # 查看当前配置
oreg switch --reset            # 重置为默认 Claude

# 6. 导出备份
oreg export -o backup.json

# 7. 同步到其他 Agent
oreg sync --agent claude,cursor
```

## 当前注册数据

| 类型 | 数量 | 分类/分组 |
|------|------|----------|
| Skills | 129 | 12 个分类 (platform, workflow, language, frontend, backend, data-ml ...) |
| MCP Servers | 31 | 15 个分组 (core, hermes, automation, devops, web_search ...) |
| Commands | 59 | opencode-scoped |
| Agents | 13 | Sisyphus, Oracle, Explorer, Plan, Build ... |

---

## 三种使用方式

### 1. CLI 命令行工具

```bash
# 基础操作
oreg scan              # 扫描/重建索引
oreg stats             # 统计概览
oreg check             # 冲突检查
oreg help              # 查看帮助

# 浏览与搜索
oreg list skill        # 按分类列出技能
oreg list mcp          # 按分组列出 MCP
oreg list command      # 列出命令
oreg list agent        # 列出代理
oreg search <关键词>    # 全文搜索
oreg info skill <名称>  # 查看技能详情
oreg info mcp <名称>   # 查看 MCP 详情

# AI 友好功能
oreg ai-context --json            # 给 AI 的紧凑上下文快照
oreg ai-context --query "关键词"   # 按关键词筛选上下文
oreg recommend "任务描述"          # 按任务推荐 Skill/MCP/Agent

# 模型一键切换（类似 CC Switch）
oreg switch --list              # 列出所有可用模型
oreg switch --current           # 查看当前模型配置
oreg switch gpt-5.5             # 切换到指定模型
oreg switch --reset             # 重置为默认 Claude 模型

# 数据管理
oreg export -o backup.json      # 导出数据
oreg import backup.json         # 导入数据
oreg import https://github.com/...  # 从 GitHub 导入
oreg enable skill <名称>         # 启用/禁用
oreg disable skill <名称>

# 多 Agent 同步
oreg sync --agent claude,cursor
oreg link opencode --target claude
```

### 2. MCP Server（AI 调用）

已在 `opencode.json` 注册为 `opencode-registry`，AI 会话中可直接调用：

| MCP Tool | 说明 | 参数 |
|----------|------|------|
| `registry_search` | 全文搜索 | `query` (必填), `kind`, `limit` |
| `registry_list_skills` | 列出所有技能 | `category`, `enabled_only`, `limit` |
| `registry_list_mcp` | 列出所有 MCP | `group`, `enabled_only`, `limit` |
| `registry_get_skill` | 获取技能详情 | `name` (必填) |
| `registry_get_mcp` | 获取 MCP 详情 | `name` (必填) |
| `registry_stats` | 获取统计信息 | — |
| `registry_export_json` | 导出 JSON | `types`, `enabled_only` |
| `registry_ai_context` | **AI 紧凑上下文快照** | `query`, `kind`, `limit`, `output_path` |
| `registry_recommend` | **任务智能推荐** | `task` (必填), `kind`, `limit` |
| `registry_search_mcp_by_capability` | 按能力搜索 MCP | `capability` (必填) |
| `registry_skill_dependencies` | 技能-MCP 依赖关系 | `skill_name` |

**MCP 调用示例：**
```json
// 获取浏览器自动化相关的上下文
{
  "name": "registry_ai_context",
  "arguments": {
    "query": "browser automation",
    "kind": "skill",
    "limit": 5
  }
}

// 按任务推荐
{
  "name": "registry_recommend",
  "arguments": {
    "task": "需要做浏览器自动化测试",
    "limit": 8
  }
}
```

### 3. Web Dashboard

```bash
npm run dashboard
# → http://localhost:3456
```

Vue 3 + Chart.js 单页应用（无构建步骤），提供：
- 统计图表
- 分类树视图
- 分组视图
- 搜索功能
- 详情弹窗

---

## 完整 API 文档

### AI 上下文 API

```bash
oreg ai-context [options]
```

**选项：**
- `-q, --query <string>` - 搜索关键词，筛选匹配的记录（支持中英文别名映射）
- `-t, --type <kind>` - 限定类型: `skill|mcp|command|agent`
- `-l, --limit <n>` - 返回记录数量上限 (默认: 20)
- `-o, --output <path>` - 导出到 JSON 文件
- `--json` - JSON 格式输出

**MCP Tool:** `registry_ai_context`

**输出结构（ai-context.v1）：**
```json
{
  "formatVersion": "ai-context.v1",
  "generatedAt": "2025-01-01T00:00:00.000Z",
  "stats": { "skills": 129, "mcpServers": 31, "commands": 59, "agents": 13 },
  "agentPaths": {
    "opencode": { "configFile": "...", "skillDir": "..." },
    "claude": { ... },
    "cursor": { ... }
  },
  "shared": [
    { "kind": "skill", "name": "...", "description": "...", "enabled": true }
  ],
  "agentSpecific": {
    "claude": [ ... ],
    "cursor": [ ... ]
  },
  "recommendedCalls": [
    "oreg info skill playwright-expert",
    "oreg sync --agent claude"
  ],
  "records": [ ... ]
}
```

---

### 任务推荐 API

```bash
oreg recommend <task> [options]
```

**参数：**
- `task` (必填) - 自然语言任务描述（支持中英文，如 "浏览器自动化测试"）

**选项：**
- `-t, --type <kind>` - 限定类型: `skill|mcp|command|agent`
- `-l, --limit <n>` - 推荐数量上限 (默认: 10)
- `--json` - JSON 格式输出

**MCP Tool:** `registry_recommend`

**中文关键词别名映射：**
- 浏览器 → browser, playwright, web
- 网页 → browser, web, frontend
- 自动化 → automation, automated
- 测试 → test, testing, playwright
- 代码审查 → review, code-review, github
- 数据库 → database, sql, postgres
- 文档 → document, docs, markdown
- 部署 → deploy, devops

**输出示例：**
```json
{
  "task": "需要浏览器自动化测试",
  "terms": ["浏览器", "automation", "test", "playwright"],
  "recommendations": [
    {
      "kind": "skill",
      "name": "playwright-expert",
      "score": 5.25,
      "enabled": true,
      "description": "...",
      "use": "oreg info skill playwright-expert"
    }
  ]
}
```

---

### 模型一键切换 API（类似 CC Switch）

```bash
oreg switch [model] [options]
```

**参数：**
- `model` (可选) - 模型名称，如 `gpt-5.5`, `claude-sonnet-4-6`, `qwen3-64b`

**选项：**
- `-l, --list` - 列出所有可用模型
- `-c, --current` - 查看当前配置
- `-r, --reset` - 重置为默认 Claude 模型
- `--dry-run` - 预览修改，不实际写入文件

**内置支持模型：**
| 模型名 | 说明 |
|--------|------|
| `claude-sonnet-4-6` | 官方 Claude 模型（默认） |
| `gpt-5.5` | OpenAI GPT-5.5（兼容 OpenAI 协议中转） |
| `gpt-4.5-preview` | OpenAI GPT-4.5 Preview |
| `qwen3-64b` | 阿里云通义千问 3.0 64B |
| `deepseek-v3` | 深度求索 DeepSeek V3 |

**配置文件：** `claude-model-map.json`
```json
{
  "default": {
    "model": "claude-sonnet-4-6",
    "env": {
      "ANTHROPIC_BASE_URL": "http://127.0.0.1:8327/v1",
      "ANTHROPIC_API_KEY": "sk-test-key"
    },
    "maxTokens": 8192,
    "permissions": { "allow": ["Bash", "Edit", "Read", "Write", "Glob", "Grep"] }
  },
  "sourceModelMap": {
    "gpt-5.5": { ... },
    "qwen3-64b": { ... }
  }
}
```

**工作原理：**
1. 读取 `claude-model-map.json` 中的模型映射配置
2. 根据选择的模型名查找对应的配置
3. 更新 Claude Desktop 的配置文件（位置因平台而异）
4. 重启 Claude 后生效

---

### 多 Agent 同步 API

```bash
oreg sync [options]
```

**选项：**
- `--agent <agents>` - 目标 Agent (逗号分隔): `opencode,claude,cursor,codex,windsurf` (默认: opencode)
- `--link` - 同步时用 symlink 共享技能文件（不用拷贝，单真相源）

**同步内容：**
- MCP 配置：同步启用的 MCP 服务器配置
- 技能目录：通过 symlink 共享技能目录
- 模型配置：同步 Hermes/OpenCode 的自定义 provider
- 环境变量：自动注入 API Key 和中转地址

---

### 其他 API

#### 搜索
```bash
oreg search <query> [options]
```
- `--type <kind>` - 限定类型
- `--limit <n>` - 返回数量上限
- `--json` - JSON 格式输出

#### 导入
```bash
oreg import <source> [options]
```
- `source` - JSON 文件路径、技能目录、或 Git 仓库 URL
- `--dry-run` - 预览导入内容
- `--format <format>` - 导入格式: `json|dir`

#### 导出
```bash
oreg export [options]
```
- `-o, --output <path>` - 输出路径 (默认: `./registry-export`)
- `-t, --types <types>` - 导出类型 (逗号分隔): `skill,mcp,command,agent`
- `-f, --format <format>` - 导出格式: `dir|zip|json`

#### 冲突检查
```bash
oreg check
```
- 检查重复技能/MCP
- 检查配置漂移
- 检查 Hermes 兼容性
- 输出问题报告和修复建议

---

## 面向 AI Agent 的直接使用方式

对标 CC Switch 的「统一管理 MCP/Skills + 一键切换模型」理念，提供机器可读入口，方便 AI 先发现能力，再决定加载哪个技能或 MCP。

```bash
# 1) 获取紧凑上下文：统计、配置路径、推荐调用、匹配记录
oreg ai-context --json

# 2) 按任务筛选上下文，减少 token
oreg ai-context --query "github pull request review" --type skill --limit 8 --json

# 3) 让 registry 直接推荐可用能力
oreg recommend "需要浏览网页并做自动化验证" --json

# 4) 一键切换模型
oreg switch gpt-5.5

# 5) 导出给其他 Agent / 其他机器读取
oreg ai-context -o /mnt/d/ai-outputs/opencode-registry/ai-context.json
```

**安全边界：**
- 上下文只暴露环境变量名，不输出真实密钥
- 同步到各 Agent 前先跑 `oreg check` 做冲突检查
- 使用 `--dry-run` 预览所有写入操作

---

## 可移植配置

```bash
export OPENCODE_CONFIG_PATH=/path/to/opencode.json
export OPENCODE_MCP_GROUPS_PATH=/path/to/mcp-groups.json
export OPENCODE_SKILL_DIRS="/path/to/skills1:opencode,/path/to/skills2:project"
export REGISTRY_DB_PATH=/path/to/registry.db
oreg scan
```

---

## 技术栈

- **TypeScript 5** - 类型安全
- **SQLite (better-sqlite3)** - 本地数据库存储
- **Commander.js** - CLI 框架
- **Model Context Protocol SDK** - MCP Server 实现
- **Node.js HTTP** - Web Dashboard 服务端
- **Vue 3 + Chart.js** - Web Dashboard 前端

---

## 项目结构

```
src/
├── core/                    # 核心模块
│   ├── types.ts             # 数据模型定义
│   ├── storage.ts           # SQLite CRUD 操作
│   ├── scanner.ts           # opencode.json + 文件系统扫描
│   ├── platform.ts          # 多平台 Agent 路径检测
│   ├── ai-context.ts        # AI 上下文快照生成
│   └── index.ts             # 核心导出入口
├── cli/                     # CLI 命令行
│   ├── index.ts             # CLI 入口 (commander)
│   └── commands/            # 各命令实现
│       ├── scan.ts
│       ├── list.ts
│       ├── search.ts
│       ├── info.ts
│       ├── stats.ts
│       ├── export.ts
│       ├── import.ts
│       ├── enable.ts
│       ├── check.ts
│       ├── link.ts
│       ├── sync.ts
│       ├── ai-context.ts    # AI 上下文命令
│       ├── recommend.ts     # 任务推荐命令
│       └── switch.ts        # 模型一键切换命令（类似 CC Switch）
├── mcp-server/              # MCP 协议服务
│   └── index.ts             # 11 个 MCP 工具实现
└── web/                     # Web Dashboard
    ├── server.ts            # HTTP API 服务
    └── index.html           # Vue 3 单页应用

claude-model-map.json        # Claude 模型映射配置（CC Switch 兼容）
```

---

## 与 CC Switch 的对比

| 特性 | CC Switch | OpenCode Registry |
|------|-----------|-------------------|
| 模型切换 | ✅ GUI 切换 | ✅ CLI 一键切换 |
| 多平台支持 | ✅ 桌面应用 | ✅ WSL/Linux/macOS/Windows |
| MCP 统一管理 | ✅ 基础 | ✅ 完整注册中心 |
| Skill 发现 | ❌ | ✅ 搜索 + 推荐 |
| 多 Agent 同步 | ❌ | ✅ Claude/Cursor/Codex/Windsurf |
| AI 友好接口 | ❌ | ✅ MCP + JSON API |
| 中文支持 | ✅ | ✅ 完整中文支持 |

**定位差异：**
- CC Switch：桌面 GUI 应用，专注于模型切换体验
- OpenCode Registry：CLI + MCP 工具，专注于能力发现、统一管理、AI 集成

---

## License

MIT
