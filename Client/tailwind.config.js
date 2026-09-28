/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#F97316",
          "orange-hover": "#EA580C",
          dark: "#161A1D",
          charcoal: "#202D2D",
          muted: "#485563",
          light: "#F9FAFB",
          border: "#CBD5E1",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          gray: '#282f37',
          orangeHover: '#EA580C',
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        jetbrains: ["JetBrains Mono", "monospace"],
        inter: ["Inter", "sans-serif"],
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
};
      
  
