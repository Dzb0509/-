import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        // 来自 docs/landing.html 的瓷白 / 青花靛 / 番茄红 / 溏心黄配色
        porcelain: '#F7F3EC',
        ink: '#26221B',
        indigo: {
          DEFAULT: '#1D4E89',
          deep: '#16406F',
          pale: '#EAF1F7'
        },
        celadon: '#E4ECEF',
        tomato: { DEFAULT: '#D9442B', dark: '#B93623' },
        yolk: '#E8A33D',
        primary: {
          DEFAULT: '#1D4E89',
          50: '#EAF1F7',
          100: '#D8E6F2',
          200: '#B8CDE0',
          300: '#7FA6C8',
          400: '#4C7EAF',
          500: '#1D4E89',
          600: '#16406F',
          700: '#12385F',
          800: '#0F2D4D',
          900: '#0A2038'
        },
        accent: { DEFAULT: '#D9442B', light: '#E8A33D', dark: '#B93623' }
      },
      fontFamily: {
        sans: ['system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Noto Serif SC', 'Songti SC', 'SimSun', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(38, 34, 27, 0.04), 0 8px 24px rgba(38, 34, 27, 0.06)',
        'card-hover': '0 4px 10px rgba(29, 78, 137, 0.10), 0 14px 32px rgba(38, 34, 27, 0.10)'
      }
    }
  }
}
