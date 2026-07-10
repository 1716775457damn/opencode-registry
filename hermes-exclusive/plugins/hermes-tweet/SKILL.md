---
name: hermes-tweet
description: "Native Hermes Agent plugin for X/Twitter — search, read, and guarded action workflows through Xquik API"
category: hermes-plugin
version: 1.0.0
author: Xquik-dev
source: https://github.com/Xquik-dev/hermes-tweet
tags: [twitter, x, social-media, tweet, plugin, hermes]
platforms: [linux, macos, windows]
---

# hermes-tweet

Native Hermes Agent plugin for X/Twitter. Ships plugin manifests, SKILL.md bundles, installer prompts for API keys, and compatibility tests against current Hermes plugin behavior.

## Features

- X/Twitter search and read
- Guarded action workflows (post, retweet, like)
- API key setup prompts
- Compatibility-tested against Hermes

## Installation

```bash
git clone https://github.com/Xquik-dev/hermes-tweet.git ~/.hermes/plugins/hermes-tweet
hermes plugins enable hermes-tweet
```

## Requirements

- Xquik API key
