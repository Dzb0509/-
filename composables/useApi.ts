/** Resolve API requests for both the same-origin Worker build and GitHub Pages. */
export function useApiUrl(): (path: string) => string {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase || '').replace(/\/$/, '')
  return (path: string) => `${base}${path.startsWith('/') ? path : `/${path}`}`
}
