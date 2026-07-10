---
name: mnemo-hermes
description: "Semantic memory plugin — adds pgvector vector search to Hermes's built-in FTS5 memory. Fully local via Ollama, no API keys needed."
category: hermes-plugin
version: 1.0.0
author: eleion-ai
source: https://github.com/eleion-ai/mnemo-hermes
tags: [memory, vector-search, semantic, ollama, plugin, hermes]
platforms: [linux, macos]
---

# mnemo-hermes

Semantic memory plugin for Hermes Agent. Adds pgvector vector search to Hermes's built-in FTS5 memory, enabling semantic recall alongside keyword search.

## Features

- 5 tools for semantic memory operations
- `on_session_start` hook for automatic context loading
- Fully local via Ollama — no API keys
- MIT licensed

## Installation

```bash
git clone https://github.com/eleion-ai/mnemo-hermes.git ~/.hermes/plugins/mnemo-hermes
hermes plugins enable mnemo-hermes
```

## Requirements

- PostgreSQL with pgvector extension
- Ollama (for local embeddings)
