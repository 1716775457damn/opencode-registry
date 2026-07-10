---
name: hermes-incident-cmd
description: "Autonomous SRE agent for production incident detection and self-healing — monitors services, diagnoses failures, applies fixes via Hermes cron"
category: hermes
version: 1.0.0
author: Lethe044
source: https://github.com/Lethe044/hermes-incident-commander
tags: [sre, incident-response, devops, self-healing, monitoring, hermes]
platforms: [linux, macos]
---

# hermes-incident-commander

Autonomous SRE (Site Reliability Engineering) agent that runs inside Hermes. Detects production incidents, diagnoses root causes, and applies self-healing fixes.

## Features

- Service health monitoring via Hermes cron scheduling
- Automatic incident diagnosis with root cause analysis
- Self-healing runbook execution
- Incident timeline tracking and post-mortem generation

## Installation

```bash
git clone https://github.com/Lethe044/hermes-incident-commander.git ~/.hermes/skills/hermes-incident-cmd
```

## Usage

Set up as a cron job:
```
/cron create "every 5m" --skills hermes-incident-cmd --prompt "Check all monitored services and report status"
```
