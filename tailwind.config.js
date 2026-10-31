/** @type {import('tailwindcss').Config} */
// CareCost — dark "black & green" theme.
// Scale semantics on the dark ground:
//   pine-50…300  → dark green tints (fills, rings, borders)
//   pine-500…700 → vivid greens (accents, icons, focus)
//   pine-800…950 → light mint (readable green text)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Manrope', '"Public Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#22c55e',
          strong: '#4ade80',
          ink: '#03140a', // text on accent
        },
        shell: '#030504',
        surface: {
          DEFAULT: '#0b110f',
          2: '#121a17',
        },
        pine: {
          950: '#dcfce7',
          900: '#bbf7d0',
          800: '#86efac',
          700: '#4ade80',
          600: '#2ee07a',
          500: '#22c55e',
          300: '#1d6b45',
          200: '#134a30',
          100: '#0b2418',
          50: '#07160f',
        },
        paper: {
          DEFAULT: '#050807',
          100: '#0c1210',
          200: '#18211d',
        },
        ink: {
          DEFAULT: '#e9f2ec',
          700: '#c3cec8',
          600: '#a0ada6',
          500: '#84918a',
        },
        line: '#1d2824',
        amberx: {
          50: '#1a1305',
          100: '#2a1d06',
          700: '#f5b942',
          800: '#fcd581',
        },
        rust: {
          50: '#1f0a09',
          100: '#3b1513',
          700: '#f87171',
          800: '#fca5a5',
        },
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)',
        lift: '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 48px rgba(0,0,0,0.55)',
        glow: '0 0 0 1px rgba(34,197,94,0.35), 0 8px 32px rgba(34,197,94,0.18)',
      },
      borderRadius: {
        xl2: '1.125rem',
      },
    },
  },
  plugins: [],
}
