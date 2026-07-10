---
name: hermes-nextcloud
description: "Self-hosted Nextcloud bridge — files (WebDAV), notes, calendar (CalDAV), contacts (CardDAV) with App Password auth"
category: hermes
version: 1.0.0
author: adnw-vinc
source: https://github.com/adnw-vinc/hermes-nextcloud
tags: [nextcloud, cloud, self-hosted, webdav, caldav, carddav, hermes]
platforms: [linux, macos, windows]
---

# hermes-nextcloud

Self-hosted Nextcloud bridge for Hermes Agent covering files (WebDAV), notes (Nextcloud Notes API), calendar and tasks (CalDAV), and contacts (CardDAV).

## Features

- File read/write via WebDAV
- Notes CRUD via Nextcloud Notes API
- Calendar and task management via CalDAV
- Contact management via CardDAV
- App Password authentication
- Configurable timezone

## Installation

```bash
git clone https://github.com/adnw-vinc/hermes-nextcloud.git ~/.hermes/skills/hermes-nextcloud
```

## Configuration

Set in `.env`:
```
NEXTCLOUD_URL=https://your.nextcloud.instance
NEXTCLOUD_USER=your-username
NEXTCLOUD_APP_PASSWORD=your-app-password
```
