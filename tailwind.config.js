/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ea: {
          bg: '#07070f',
          surface: '#0d0d1e',
          card: '#11112a',
          border: '#1e1e3f',
          green: '#00ff88',
          cyan: '#00d4ff',
          purple: '#8b5cf6',
          amber: '#f59e0b',
          red: '#ff4444',
          muted: '#6b7280',
          text: '#e2e8f0',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'count-up': 'countUp 1.5s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px #00ff88aa)' },
          '50%': { filter: 'drop-shadow(0 0 20px #00ff88)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'ea-glow': '0 0 20px rgba(0, 255, 136, 0.15)',
        'ea-glow-strong': '0 0 40px rgba(0, 255, 136, 0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      }
    }
  },
  plugins: []
}
