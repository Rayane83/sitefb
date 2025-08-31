import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0e14',
        foreground: '#e6edf3',
        primary: {
          DEFAULT: '#1EA7AB', // teal from logo
          foreground: '#ffffff'
        },
        muted: '#10151c',
        card: '#0e131b',
        border: '#1d2533',
        accent: '#128089'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.25)'
      }
    }
  },
  plugins: []
} satisfies Config