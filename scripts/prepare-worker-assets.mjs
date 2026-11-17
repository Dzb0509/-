import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.output/public')
const entry = path.resolve(process.argv[3] || 'dist/server/index.js')

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const absolute = path.join(dir, item.name)
    return item.isDirectory() ? files(absolute) : [absolute]
  })
}

const assets = {}
for (const filename of files(root)) {
  const relative = path.relative(root, filename).split(path.sep).join('/')
  const pathname = `/${relative}`
  const ext = path.extname(filename).toLowerCase()
  assets[pathname] = {
    type: MIME[ext] || 'application/octet-stream',
    body: fs.readFileSync(filename).toString('base64')
  }
}

const source = `import worker from './index.mjs'

const assets = ${JSON.stringify(assets)}

function decode(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const asset = assets[url.pathname]
    if (asset && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(request.method === 'HEAD' ? null : decode(asset.body), {
        headers: {
          'content-type': asset.type,
          'cache-control': url.pathname.startsWith('/_nuxt/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
        }
      })
    }
    return worker.fetch(request, env, ctx)
  }
}
`

fs.mkdirSync(path.dirname(entry), { recursive: true })
fs.writeFileSync(entry, source)
console.log(`Embedded ${Object.keys(assets).length} client assets into ${entry}`)
