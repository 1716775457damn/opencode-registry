# OpenCode Registry

**Skills & MCP 标准化管理工具** — 扫描、搜索、导出、可视化你在 OpenCode 生态中的所有技能、MCP 服务器、命令和代理。

## 快速开始

```bash
# 1. 安装
cd /mnt/d/ai-outputs/opencode-registry
npm install && npm run build

# 2. 注册全局命令
npm link    # 之后可以直接用 oreg

# 3. 扫描你的当前配置
oreg scan

# 4. 查看统计概览
oreg stats

# 5. 搜索
oreg search database
oreg search playwright --type skill

# 6. 列出
oreg list skill
oreg list mcp
oreg list command
oreg list agent

# 7. 查看详情
oreg info mcp filesystem
oreg info skill python-pro

# 8. 导出
oreg export -o ./my-registry.json

# 9. 启用/禁用
oreg enable mcp rust_code_map
oreg disable mcp rust_code_map
```

## 数据模型

| 类型 | 说明 | 当前数量 |
|------|------|---------|
| `skill` | 技能 (SKILL.md) | 196 |
| `mcp` | MCP 服务器 | 30 |
| `command` | 命令 | 59 |
| `agent` | 代理 | 13 |

## 分类体系

### Skills 分类（从 frontmatter domain/compatibility 自动提取）

- `language` — Python, Rust, Go, Java, TypeScript...
- `frontend` — React, Vue, Angular, Next.js...
- `backend` — Django, FastAPI, NestJS, Spring Boot...
- `infrastructure` — Docker, K8s, Terraform...
- `data-ml` — ML Pipeline, RAG, Spark, Pandas...
- `api-architecture` — REST, GraphQL, API Design...
- `platform` — WordPress, Shopify, Salesforce...
- `mobile` — Flutter, React Native, Swift...

### MCP 分组（从 mcp-groups.json 自动读取）

- `core` — filesystem, fetch, time, git
- `web_search` — websearch, grep_app
- `automation` — playwright, chrome_browser
- `memory_search` — claude-mem:mcp-search
- `devops` — github, vercel
- `reasoning` — sequentialthinking
- `hermes` — hermes-memory, hermes-session

## 作为 MCP Server 使用

注册中心自身也可以作为 MCP Server 运行，让 AI 直接查询：

```json
{
  "mcpServers": {
    "opencode-registry": {
      "command": "node",
      "args": ["/mnt/d/ai-outputs/opencode-registry/dist/mcp-server/index.js"],
      "env": {}
    }
  }
}
```

### 可用的 MCP Tools

| Tool | 说明 |
|------|------|
| `registry_search` | 搜索技能/MCP/命令/代理 |
| `registry_list_skills` | 列出技能（支持分类筛选） |
| `registry_list_mcp` | 列出 MCP 服务器 |
| `registry_get_skill` | 获取技能详情 |
| `registry_get_mcp` | 获取 MCP 详情 |
| `registry_stats` | 注册中心统计 |
| `registry_export_json` | 导出为 JSON |
| `registry_search_mcp_by_capability` | 按能力搜索 MCP |
| `registry_skill_dependencies` | 查看技能-MCP 依赖关系 |

## 导入/导出

```bash
# 导出全部
oreg export -o ./registry.json

# 只导出 MCP
oreg export -t mcp -o ./mcps.json

# 导出特定类型
oreg export -t skill,mcp -o ./partial.json
```

## 架构

```
opencode-registry/
├── src/
│   ├── core/           # 核心：类型定义、SQLite 存储、扫描器
│   │   ├── types.ts    # 数据模型
│   │   ├── storage.ts  # SQLite CRUD
│   │   └── scanner.ts  # 从 opencode.json + 文件系统扫描
│   ├── cli/            # CLI 命令
│   │   ├── index.ts    # 入口 (commander)
│   │   └── commands/   # scan/list/search/info/stats/export/enable/sync
│   └── mcp-server/     # MCP 协议服务
│       └── index.ts    # 9 个 MCP tools
├── registry.db         # SQLite 数据库（自动生成）
└── package.json
```

## 和同类项目的关系

| 项目 | 与本工具的关系 |
|------|--------------|
| [agent-config-sync](https://github.com/liamdmcgarrigle/agent-config-sync) | 自动同步到 Cursor/Codex，互补 |
| [skills-registry](https://github.com/nikships/skills-registry) | 类似思路，但以 GitHub 为中心 |
| [agentregistry](https://github.com/agentregistry-dev/agentregistry) | 企业级注册中心，更重量 |
| [opencode-lazy-mcp](https://github.com/orionpax1997/opencode-lazy-mcp) | MCP 懒加载插件，互补 |
