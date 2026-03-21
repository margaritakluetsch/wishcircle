/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#C9A84C', light: '#E8D08A', dark: '#B8932E' },
        cream: '#FAF7F2',
        warm: '#F0E8D8',
        dark: '#1A1410',
        mid: '#5A4A3A',
        soft: '#9A8878',
        wishgreen: '#3D7A55',
      },
      fontFamily: {
        serif: ['Georgia', 'Garamond', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
