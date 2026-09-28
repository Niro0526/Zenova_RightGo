import type { Config } from "tailwindcss";


const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
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
          gray: "#282f37",
          orangeHover: "#EA580C",
        },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#FF6600',
        },
        sidebar: {
          bg: '#161A1D',
          border: '#242A2E',
          hover: '#1E2328',
          active: '#FF6600',
        },
        pulse: {
          green: '#22C55E',
          orange: '#FF6600',
          blue: '#0284C7',
          yellow: '#F59E0B',
          red: '#EF4444',
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        jetbrains: ["JetBrains Mono", "monospace"],
        inter: ["Inter", "sans-serif"],
        sans: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
