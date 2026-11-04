/**
 * 生产启动脚本：启动前把 .env 注入 process.env（兼容所有 Node 版本，
 * 不依赖 --env-file），然后加载 Nitro 产物。
 * 线上部署用：node start-prod.mjs
 */
import fs from 'node:fs'

try {
  const raw = fs.readFileSync('.env', 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
} catch {
  console.warn('[start] 未找到 .env，AI 能力将降级为规则引擎')
}

await import('./.output/server/index.mjs')
