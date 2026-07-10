---
name: hermes-oh-my
description: "Multi-agent orchestration suite for Hermes — deep-research, deep-interview, ralph (execute→verify→iterate), triage, autopilot"
category: hermes
version: 1.0.0
author: witt3rd
source: https://github.com/witt3rd/oh-my-hermes
tags: [multi-agent, orchestration, research, automation, hermes]
platforms: [linux, macos, windows]
---

# oh-my-hermes

Multi-agent orchestration skills for Hermes Agent, inspired by `oh-my-claudecode` and rebuilt on Hermes primitives.

## Capabilities

- **deep-research** — Autonomous multi-source research agent
- **deep-interview** — Structured interview agent
- **ralplan** — Planner → Architect → Critic consensus workflow
- **ralph** — Execute → verify → iterate development loop
- **triage** — Intelligent task routing
- **autopilot** — End-to-end autonomous execution

## Installation

```bash
git clone https://github.com/witt3rd/oh-my-hermes.git ~/.hermes/skills/hermes-oh-my
hermes skills config --enable hermes-oh-my
```

## Usage

In Hermes session, load with:
```
/skill hermes-oh-my
```

Then invoke: `/ralph "implement feature X"` or `/deep-research "topic Y"`
