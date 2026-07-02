import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RegistryStorage } from '../core/storage.js'

const PORT = parseInt(process.env.REGISTRY_PORT || '') || 3456
const storage = new RegistryStorage()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.resolve(__dirname, '../../src/web/index.html')

function jsonResponse(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

function parseQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?')
  if (idx === -1) return {}
  return Object.fromEntries(new URLSearchParams(url.slice(idx)).entries())
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  const method = req.method || 'GET'

  if (method === 'GET' && (url === '/' || url === '/index.html')) {
    const filePath = path.resolve(htmlPath)
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(fs.readFileSync(filePath, 'utf-8'))
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<h1>OpenCode Registry Dashboard</h1><p>Build the dashboard HTML at: ' + htmlPath + '</p>')
    }
    return
  }

  if (method === 'GET' && url.startsWith('/api/')) {
    const parts = url.slice(5).split('?')[0].split('/')
    const query = parseQuery(url)

    try {
      switch (parts[0]) {
        case 'stats': {
          jsonResponse(res, storage.getSummary())
          break
        }
        case 'skills': {
          const skills = storage.listSkills({
            category: query.category,
            enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined
          })
          jsonResponse(res, skills)
          break
        }
        case 'skill': {
          const skill = storage.getSkill(parts[1])
          skill ? jsonResponse(res, skill) : jsonResponse(res, { error: 'not found' }, 404)
          break
        }
        case 'mcp': {
          const servers = storage.listMCPServers({
            group: query.group,
            enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined
          })
          jsonResponse(res, servers)
          break
        }
        case 'mcp-detail': {
          const mcp = storage.getMCPServer(parts[1])
          mcp ? jsonResponse(res, mcp) : jsonResponse(res, { error: 'not found' }, 404)
          break
        }
        case 'commands': {
          const cmds = storage.listCommands({
            scope: query.scope,
            enabled: query.enabled !== undefined ? query.enabled === 'true' : undefined
          })
          jsonResponse(res, cmds)
          break
        }
        case 'agents': {
          jsonResponse(res, storage.listAgents())
          break
        }
        case 'search': {
          if (!query.q) { jsonResponse(res, { error: 'missing q' }, 400); return }
          const kind = query.kind as any
          jsonResponse(res, storage.search(query.q, kind))
          break
        }
        case 'categories': {
          const summary = storage.getSummary()
          jsonResponse(res, Object.keys(summary.skills.categories).sort())
          break
        }
        case 'mcp-groups': {
          const summary = storage.getSummary()
          jsonResponse(res, Object.keys(summary.mcpServers.groups).sort())
          break
        }
        default:
          jsonResponse(res, { error: 'unknown endpoint' }, 404)
      }
    } catch (e: any) {
      jsonResponse(res, { error: e.message }, 500)
    }
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenCode Registry Dashboard → http://localhost:${PORT}`)
  console.log(`API: http://localhost:${PORT}/api/stats`)
})

process.on('SIGINT', () => { storage.close(); process.exit(0) })
process.on('SIGTERM', () => { storage.close(); process.exit(0) })
