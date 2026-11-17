/** Resolve a public asset for both GitHub Pages (/-/) and Sites (/). */
export function useAssetUrl(): (path: string) => string {
  const config = useRuntimeConfig()
  const base = String(config.app.baseURL || '').replace(/\/$/, '')
  return (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`
}
