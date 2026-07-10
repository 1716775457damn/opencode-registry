---
name: hermes-ops-kit
description: "Operational and security plugin — provider routing, Bitwarden key management, MCP auditing, cost governance, diagnostics, remote assistant delegation"
category: hermes-plugin
version: 1.0.0
author: redoracle
source: https://github.com/redoracle/hermes-ops-kit
tags: [security, ops, secrets, cost, governance, plugin, hermes]
platforms: [linux, macos, windows]
---

# hermes-ops-kit

Production-grade operational and security plugin for Hermes Agent. 7 tools + 2 hooks via native Hermes plugin manifest. 201 tests, MIT.

## Features

- Provider routing and health monitoring
- Bitwarden/Vaultwarden-backed secret management
- Preflight plugin scanning and enforcement
- MCP tool auditing
- Cost governance and tracking
- Diagnostics and image routing
- Remote assistant delegation

## Installation

```bash
git clone https://github.com/redoracle/hermes-ops-kit.git ~/.hermes/plugins/hermes-ops-kit
hermes plugins enable hermes-ops-kit
```
