# OpenCode Registry

**Skills & MCP 标准化管理工具** — 扫描、搜索、导入导出、可视化你在 OpenCode 生态中的所有技能、MCP 服务器、命令和代理。

[![GitHub](https://img.shields.io/badge/GitHub-1716775457damn%2Fopencode--registry-blue)](https://github.com/1716775457damn/opencode-registry)

## 功能

| 功能 | CLI | Web | MCP |
|------|-----|-----|-----|
| 扫描现有配置 | `oreg scan` | ✅ | — |
| 查看统计 | `oreg stats` | ✅ | `registry_stats` |
| 搜索 | `oreg search <q>` | ✅ | `registry_search` |
| 分类浏览 | `oreg list skill` | ✅ | `registry_list_skills` |
| MCP 分组浏览 | `oreg list mcp` | ✅ | `registry_list_mcp` |
| 详情 | `oreg info <type> <name>` | ✅ | `registry_get_*` |
| 导出 JSON | `oreg export` | — | `registry_export_json` |
| 导入 JSON/Git/目录 | `oreg import <src>` | — | — |
| 启用/禁用 | `oreg enable/disable` | — | — |
| 同步到 Cursor/Codex | `oreg sync` | — | — |

## 快速开始

```bash
# 安装
cd /mnt/d/ai-outputs/opencode-registry
npm install && npm run build

# 全局安装 CLI
npm link    # 之后可直接运行 oreg

# 扫描当前 OpenCode 配置
oreg scan

# 查看统计
oreg stats

# 搜索
oreg search database
oreg search playwright --type skill

# 导出/导入
oreg export -o backup.json
oreg import backup.json

# 从 GitHub 导入技能
oreg import https://github.com/stephanzwicknagl/opencode-skills.git

# 同步到 Cursor/Codex
oreg sync
```

## 当前注册数据

| 类型 | 数量 | 分类/分组 |
|------|------|----------|
| Skills | 129 | 12 个分类 (platform, workflow, language, frontend, backend, data-ml ...) |
| MCP Servers | 31 | 15 个分组 (core, hermes, automation, devops, web_search ...) |
| Commands | 59 | opencode-scoped |
| Agents | 13 | Sisyphus, Oracle, Explorer, Plan, Build ... |

## 三种使用方式

### 1. CLI 工具

```bash
oreg scan              # 扫描/重建索引
oreg list skill        # 按分类列出技能
oreg list mcp          # 按分组列出 MCP
oreg list command      # 列出命令
oreg list agent        # 列出代理
oreg search <关键词>    # 全文搜索
oreg info skill <名称>  # 查看技能详情
oreg info mcp <名称>   # 查看 MCP 详情
oreg export            # 导出为 JSON
oreg import <src>      # 导入 (JSON/Git/目录)
oreg enable/disable    # 启用/禁用
oreg sync              # 同步到 opencode.json + Cursor + Codex
```

### 2. Web Dashboard

```bash
npm run dashboard
# → http://localhost:3456
```

Vue 3 + Chart.js 单页应用（无构建步骤），提供统计图表、分类树、分组视图、搜索、详情弹窗。

### 3. MCP Server

已在 opencode.json 注册为 `opencode-registry`，AI 会话中可直接调用：

| MCP Tool | 说明 |
|----------|------|
| `registry_search` | 搜索所有类型 |
| `registry_list_skills` | 按分类列出技能 |
| `registry_list_mcp` | 按分组列出 MCP |
| `registry_get_skill` | 技能详情 |
| `registry_get_mcp` | MCP 详情 |
| `registry_stats` | 注册中心统计 |
| `registry_export_json` | 导出 JSON |
| `registry_search_mcp_by_capability` | 按能力搜索 MCP |
| `registry_skill_dependencies` | 技能-MCP 依赖关系 |

## 可移植配置

```bash
export OPENCODE_CONFIG_PATH=/path/to/opencode.json
export OPENCODE_MCP_GROUPS_PATH=/path/to/mcp-groups.json
export OPENCODE_SKILL_DIRS="/path/to/skills1:opencode,/path/to/skills2:project"
export REGISTRY_DB_PATH=/path/to/registry.db
oreg scan
```

## 技术栈

- TypeScript 5
- Node.js HTTP（Web Dashboard）
- SQLite (better-sqlite3)
- Commander.js（CLI）
- Model Context Protocol SDK（MCP Server）
- Vue 3 + Chart.js（Dashboard 前端）

## 项目结构

```
src/
├── core/           # 类型定义、SQLite 存储、扫描器
│   ├── types.ts    # 数据模型
│   ├── storage.ts  # SQLite CRUD
│   └── scanner.ts  # 扫描 opencode.json + 文件系统
├── cli/            # CLI 命令
│   ├── index.ts    # 入口 (commander)
│   └── commands/   # scan/list/search/info/stats/export/import/enable/sync
├── mcp-server/     # MCP 协议服务 (9 tools)
│   └── index.ts
└── web/            # Web Dashboard
    ├── server.ts   # HTTP API 服务
    └── index.html  # Vue 3 单页应用
```
