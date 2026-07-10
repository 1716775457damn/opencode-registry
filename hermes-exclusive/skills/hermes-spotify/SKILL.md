---
name: hermes-spotify
description: "Spotify playback control for headless Linux — search, play, pause, skip, volume, device transfer via execute_code snippets"
category: hermes
version: 1.0.0
author: Alexeyisme
source: https://github.com/Alexeyisme/hermes-spotify-skill
tags: [spotify, music, audio, media, hermes]
platforms: [linux]
---

# hermes-spotify-skill

Spotify playback control for headless Linux (including Raspberry Pi 4/5). No daemon required — Hermes writes spotipy snippets and runs them through `execute_code`.

## Features

- Search and play tracks/albums/playlists
- Pause, skip, set volume
- Transfer playback between Spotify Connect devices
- Compatible with raspotify for Pi-as-speaker

## Installation

```bash
git clone https://github.com/Alexeyisme/hermes-spotify-skill.git ~/.hermes/skills/hermes-spotify
pip install spotipy
```

## Requirements

- `SPOTIPY_CLIENT_ID` and `SPOTIPY_CLIENT_SECRET` in `.env`
- Spotify Premium account
