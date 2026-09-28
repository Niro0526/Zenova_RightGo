/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      colors: {
        brand: {
          orange: '#F97316',
          orangeHover: '#EA580C',
          dark: '#171c21',
          gray: '#282f37',
        }
      }
    },
  },
  plugins: [],
}
