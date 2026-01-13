/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          50: '#fef5ee',
          100: '#fde8d8',
          200: '#fbcdb0',
          300: '#f8a97d',
          400: '#f47a48',
          500: '#f15a24',
          600: '#e24019',
          700: '#bc2f16',
          800: '#96271a',
          900: '#792318',
        },
        accent: {
          50: '#fdf4f3',
          100: '#fce8e6',
          200: '#f9d4d1',
          300: '#f4b4ae',
          400: '#ec8b82',
          500: '#df5f54',
          600: '#cb4437',
          700: '#aa362b',
          800: '#8d3028',
          900: '#762d27',
        },
        warm: {
          50: '#faf9f7',
          100: '#f3f1ed',
          200: '#e8e4dd',
          300: '#d6d0c4',
          400: '#bfb5a5',
          500: '#a99d8a',
          600: '#948673',
          700: '#7c6f5f',
          800: '#675d51',
          900: '#564e44',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
