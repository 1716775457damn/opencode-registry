---
name: hermes-skill-factory
description: "Meta-skill that auto-generates reusable Hermes skills from your repetitive workflows — point it at a task pattern, get a skill"
category: hermes
version: 1.0.0
author: Romanescu11
source: https://github.com/Romanescu11/hermes-skill-factory
tags: [meta-skill, skill-generation, automation, workflow, hermes]
platforms: [linux, macos, windows]
---

# hermes-skill-factory

A meta-skill for Hermes that automatically generates reusable skills from your repetitive workflows. Describe a task pattern you do often, and it creates a proper SKILL.md with instructions, steps, and verification.

## Features

- Observes your workflow patterns
- Generates structured SKILL.md files
- Auto-categorizes and tags new skills
- Integrates with Hermes built-in Curator

## Installation

```bash
git clone https://github.com/Romanescu11/hermes-skill-factory.git ~/.hermes/skills/hermes-skill-factory
```

## Usage

```
/skill hermes-skill-factory
/factory create "deploy docker image to production"    # Creates a new skill from description
/factory list                                           # List generated skills
```
