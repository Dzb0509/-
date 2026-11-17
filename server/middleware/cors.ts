/** Allow the public GitHub Pages shell to call the Sites Worker API. */
export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin')
  const allowed = !origin
    || origin === 'https://dzb0509.github.io'
    || origin.startsWith('http://localhost:')
    || origin.startsWith('http://127.0.0.1:')

  if (allowed) {
    setHeader(event, 'Access-Control-Allow-Origin', origin || '*')
    setHeader(event, 'Vary', 'Origin')
  }
  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Accept')
  setHeader(event, 'Access-Control-Max-Age', '86400')

  if (getMethod(event) === 'OPTIONS') return null
})
