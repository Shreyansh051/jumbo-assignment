import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          light: "#ffffff",
          dark: "#0b1220"
        },
        card: {
          light: "#f8fafc",
          dark: "#111827"
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
