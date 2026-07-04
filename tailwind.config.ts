import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Sophisticated palette — deep navy + gold.
        brand: {
          50: "#eef2fb",
          100: "#d6e0f3",
          200: "#aec1e6",
          300: "#7e9bd4",
          400: "#5172bb",
          500: "#33529c",
          600: "#26407c",
          700: "#1f3363",
          800: "#1a2a4f",
          900: "#111d39",
          950: "#0b1428",
        },
        gold: {
          50: "#fbf6e9",
          100: "#f5e8c6",
          200: "#ecd28d",
          300: "#e0b955",
          400: "#d4a437",
          500: "#bd8a26",
          600: "#9c6e20",
          700: "#7c561e",
          800: "#5f431b",
          900: "#3f2d12",
        },
        // Muted secondary (kept for status accents)
        sage: {
          50: "#f0f5f3",
          100: "#dbe8e2",
          200: "#b9d2c7",
          300: "#8fb3a4",
          400: "#669283",
          500: "#4c766a",
          600: "#3b5d54",
          700: "#314b44",
          800: "#293c37",
          900: "#22312d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
