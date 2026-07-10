---
name: hermes-evolver
description: "Evidence-driven companion to Hermes's built-in Curator — observes tool/skill events into local SQLite, generates reports, runs guarded daily evolution loops"
category: hermes-plugin
version: 1.0.0
author: pingchesu
source: https://github.com/pingchesu/hermes-curator-evolver
tags: [curator, evolution, self-improvement, sqlite, plugin, hermes]
platforms: [linux, macos, windows]
---

# hermes-curator-evolver

Evidence-driven companion for Hermes v0.12's built-in Curator. Observes tool and skill events into a local SQLite store, backfills existing session history, generates reports and dry-run proposals.

## Features

- SQLite event store for tool/skill usage
- Session history backfill
- Report and dry-run proposal generation
- Guarded daily evolution loop (append-only, backed up)
- Rollback manifests for safety

## Installation

```bash
git clone https://github.com/pingchesu/hermes-curator-evolver.git ~/.hermes/plugins/hermes-evolver
hermes plugins enable hermes-evolver
```
