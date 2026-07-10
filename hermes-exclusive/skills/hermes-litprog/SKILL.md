---
name: hermes-litprog
description: "Literate programming skill — combines code and prose into documented, executable notebooks across Hermes, Claude Code, and OpenCode"
category: hermes
version: 1.0.0
author: tlehman
source: https://github.com/tlehman/litprog-skill
tags: [literate-programming, documentation, notebook, cross-platform, hermes]
platforms: [linux, macos, windows]
---

# litprog-skill

Literate programming skill that works across Claude Code, OpenCode, and Hermes. Combines code and prose into documented, executable notebooks with a single SKILL.md.

## Features

- Write code + documentation in one flow
- Mix natural language explanations with executable code blocks
- Generate standalone literate program documents
- Cross-platform: works on Hermes, Claude Code, Codex, OpenCode

## Installation

```bash
git clone https://github.com/tlehman/litprog-skill.git ~/.hermes/skills/hermes-litprog
```

## Usage

```
/skill hermes-litprog
/litprog start "project-name"    # Start a new literate program
/litprog weave                    # Generate final document
```
