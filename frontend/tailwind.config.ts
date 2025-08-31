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
          DEFAULT: '#5865F2', // Discord blue accent
          foreground: '#ffffff'
        },
        muted: '#141821',
        card: '#0f1320',
        border: '#22283a',
        accent: '#8b84f8'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.25)'
      }
    }
  },
  plugins: []
} satisfies Config