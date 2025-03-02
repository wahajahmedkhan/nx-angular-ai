/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        dark: {
          background: '#0f172a',
          surface: '#1e293b',
          card: '#334155',
          text: '#f1f5f9',
          border: '#475569',
        },
        light: {
          background: '#f8fafc',
          surface: '#f1f5f9',
          card: '#e2e8f0',
          text: '#0f172a',
          border: '#cbd5e1',
        },
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}