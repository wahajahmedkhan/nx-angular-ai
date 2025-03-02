/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e0e0fe',
          200: '#c7b4fb',
          300: '#b7a4fb',
          400: '#9986f9',
          500: '#8768f8',
          600: '#7c5fe3',
          700: '#6c4fd3',
          800: '#5c3fc3',
          900: '#4c2fb3',
          950: '#3c1fa3',
        },
        dark: {
          background: '#0f0e11',
          surface: '#17151b',
          card: '#2b2830',
          text: '#c0bcca',
          border: '#312e37',
          button: '#1c1925',
        },
        light: {
          background: '#fff',
          surface: '#f5f5f5',
          card: '#e7e7e7',
          text: '#333',
          border: '#ddd',
          button: '#f5f5f5',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'ui-sans-serif', 'system-ui'],
        body: ['Work Sans', 'sans-serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}