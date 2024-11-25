/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6b9e45',
          dark: '#5b8a3a',
          light: '#7fb553'
        }
      }
    },
  },
  plugins: [],
};
