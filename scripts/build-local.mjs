/** Build the Node server used by the local preview. */
import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['node_modules/nuxt/bin/nuxt.mjs', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NITRO_PRESET: 'node-server',
    NUXT_APP_BASE_URL: process.env.NUXT_APP_BASE_URL || '/',
    NUXT_PUBLIC_API_BASE: process.env.NUXT_PUBLIC_API_BASE || ''
  }
})

process.exit(result.status ?? 1)
