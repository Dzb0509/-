/**
 * Resolve a public asset for both GitHub Pages (/-/) and Sites (/).
 *
 * The fallback images are part of the app bundle. A version query is added
 * so a browser that previously cached a missing asset (from before the image
 * files were deployed) will request the now existing file again.
 */
export function useAssetUrl(): (path: string) => string {
  const config = useRuntimeConfig()
  const base = String(config.app.baseURL || '').replace(/\/$/, '')
  const version = '20261117-1'
  return (path: string) => {
    const resolved = `${base}${path.startsWith('/') ? path : `/${path}`}`
    return /\.(svg|png|jpe?g|webp)(?:$|\?)/i.test(resolved)
      ? `${resolved}${resolved.includes('?') ? '&' : '?'}v=${version}`
      : resolved
  }
}
