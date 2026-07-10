# Hermes 专属资源目录

Hermes Agent 的社区精选 Skills、Plugins、MCP Servers，分类管理以便统一检索。

## 目录结构

```
hermes-exclusive/
├── skills/          # 社区 Skills (category: hermes)
│   ├── hermes-oh-my/           oh-my-hermes — 多智能体编排
│   ├── hermes-incident-cmd/    Incident Commander — 自治 SRE
│   ├── hermes-dojo/            Dojo — 自改进系统
│   ├── hermes-spotify/         Spotify — 无头播放控制
│   ├── hermes-nextcloud/       Nextcloud — 自托管云桥接
│   ├── hermes-skill-factory/   Skill Factory — 元技能生成器
│   ├── hermes-life-os/         Life OS — 个人日常助手
│   └── hermes-litprog/         LitProg — 文学编程
├── plugins/         # 社区 Plugins (category: hermes-plugin)
│   ├── mnemo-hermes/           语义记忆插件
│   ├── plur/                   多智能体共享记忆
│   ├── rtk-hermes/             终端输出压缩
│   ├── hermes-ops-kit/         运营与安全工具包
│   ├── hermes-tweet/           X/Twitter 集成
│   └── hermes-evolver/         Curator 增强版
├── mcp/             # MCP 服务器配置 (group: hermes)
│   └── hermes-mcp-import.json  MCP 导入文件
└── README.md
```

## 注册方法

```bash
# 设置扫描目录（持久化到 shell 配置）
export OPENCODE_SKILL_DIRS="/mnt/d/ai-outputs/opencode-registry/hermes-exclusive/skills:opencode,/mnt/d/ai-outputs/opencode-registry/hermes-exclusive/plugins:opencode"

# 扫描注册到 registry
oreg scan

# 导入 MCP 服务器
oreg import hermes-exclusive/mcp/hermes-mcp-import.json --format json
```

## 查询命令

```bash
# 查看所有 Hermes Skills
oreg list skill --category hermes

# 查看所有 Hermes Plugins
oreg list skill --category hermes-plugin

# 查看所有 Hermes MCPs
oreg list mcp --group hermes

# 搜索
oreg search hermes
```

## 安装到 Hermes

每个 SKILL.md 文件顶部都有完整的安装说明。通常：

```bash
# 安装 skill
git clone <repo-url> ~/.hermes/skills/<name>

# 安装 plugin
git clone <repo-url> ~/.hermes/plugins/<name>
hermes plugins enable <name>
```

MCP 服务器通过 `hermes mcp add` 添加。
