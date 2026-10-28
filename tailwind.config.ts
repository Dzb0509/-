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
        // 健康主题：主色采用翡翠绿系，强调色用于热量
        primary: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B'
        },
        accent: { DEFAULT: '#F97316', light: '#FDBA74', dark: '#C2410C' }
      },
      fontFamily: {
        sans: ['system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(16, 185, 129, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 2px 6px rgba(16, 185, 129, 0.12), 0 10px 28px rgba(0, 0, 0, 0.10)'
      }
    }
  }
}
