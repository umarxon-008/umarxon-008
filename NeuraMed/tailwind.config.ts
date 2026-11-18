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
        // Logotipdagi xoch rangi (teal-yashil)
        primary: {
          DEFAULT: "#0F8F84",
          50: "#E6F6F4",
          100: "#C0E9E4",
          200: "#93D9D1",
          300: "#5FC5BA",
          400: "#2FB0A3",
          500: "#0F8F84",
          600: "#0C776E",
          700: "#0A5F58",
          800: "#084A45",
          900: "#063632",
        },
        emerald: {
          DEFAULT: "#16A34A",
          500: "#16A34A",
          600: "#15803D",
        },
        // Sodda dizayn: binafsha va boshqa qo'shimcha ranglar o'rniga bitta asosiy rang (teal)
        violet: { DEFAULT: "#0F8F84", 50: "#E6F6F4", 100: "#C0E9E4", 200: "#93D9D1", 300: "#5FC5BA", 400: "#2FB0A3", 500: "#0F8F84", 600: "#0C776E", 700: "#0A5F58", 800: "#084A45", 900: "#063632" },
        purple: { DEFAULT: "#0F8F84", 50: "#E6F6F4", 100: "#C0E9E4", 200: "#93D9D1", 300: "#5FC5BA", 400: "#2FB0A3", 500: "#0F8F84", 600: "#0C776E", 700: "#0A5F58", 800: "#084A45", 900: "#063632" },
        sky: { 50: "#E6F6F4", 100: "#C0E9E4", 200: "#93D9D1", 300: "#5FC5BA", 400: "#2FB0A3", 500: "#0F8F84", 600: "#0C776E", 700: "#0A5F58", 800: "#084A45", 900: "#063632" },
        cyan: { 50: "#E6F6F4", 100: "#C0E9E4", 200: "#93D9D1", 300: "#5FC5BA", 400: "#2FB0A3", 500: "#0F8F84", 600: "#0C776E", 700: "#0A5F58", 800: "#084A45", 900: "#063632" },
        "deep-blue": "#1E3A8A",
        brand: { navy: "#0B2F55", teal: "#0E9AA0", emerald: "#10B981", purple: "#6D28D9" },
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
        // Sodda dizayn: gradientlar o'rniga tekis ranglar (klass nomlari saqlangan)
        "gradient-primary": "linear-gradient(#0C776E, #0C776E)",
        "gradient-brand-deep": "linear-gradient(#0A4A4A, #0A4A4A)",
        "gradient-emerald": "linear-gradient(#0C776E, #0C776E)",
        "gradient-violet": "linear-gradient(#0C776E, #0C776E)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
