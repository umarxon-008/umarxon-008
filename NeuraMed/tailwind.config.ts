import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0E7C5A",
          50: "#E6F4F0",
          100: "#C2E4D8",
          200: "#9DD4BF",
          300: "#78C4A6",
          400: "#53B48D",
          500: "#0E7C5A",
          600: "#0C6A4D",
          700: "#0A5840",
          800: "#084633",
          900: "#063426",
        },
        emerald: {
          DEFAULT: "#16A34A",
          500: "#16A34A",
          600: "#15803D",
        },
        violet: {
          DEFAULT: "#7C3AED",
          500: "#7C3AED",
          600: "#6D28D9",
        },
        "deep-blue": "#1E3A8A",
        background: {
          light: "#F8FAFC",
          dark: "#0F172A",
        },
        card: {
          light: "#FFFFFF",
          dark: "#1E293B",
        },
        "text-primary": "#0F172A",
        "text-secondary": "#475569",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px rgba(0,0,0,0.05)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #0E7C5A 0%, #7C3AED 100%)",
        "gradient-emerald": "linear-gradient(135deg, #16A34A 0%, #0E7C5A 100%)",
        "gradient-violet": "linear-gradient(135deg, #7C3AED 0%, #1E3A8A 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
