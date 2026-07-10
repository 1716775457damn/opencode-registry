---
name: rtk-hermes
description: "Plugin that compresses terminal output via RTK before it reaches LLM context — 60-90% token reduction on shell commands, zero config"
category: hermes-plugin
version: 1.0.0
author: ogallotti
source: https://github.com/ogallotti/rtk-hermes
tags: [compression, token-saving, terminal, performance, plugin, hermes]
platforms: [linux, macos]
---

# rtk-hermes

Hermes Agent plugin that intercepts shell commands via `pre_tool_call` and compresses terminal output through RTK before it reaches the LLM context.

## Features

- 60–90% token reduction on shell command output
- Zero configuration — auto-loads on gateway boot
- Transparent compression/decompression
- No quality degradation

## Installation

```bash
git clone https://github.com/ogallotti/rtk-hermes.git ~/.hermes/plugins/rtk-hermes
hermes plugins enable rtk-hermes
```
