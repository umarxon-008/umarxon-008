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
        violet: {
          DEFAULT: "#7C3AED",
          500: "#7C3AED",
          600: "#6D28D9",
        },
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
        // Logotip gradienti: emerald -> teal -> binafsha
        "gradient-primary": "linear-gradient(135deg, #10B981 0%, #0E9AA0 45%, #6D28D9 100%)",
        "gradient-brand-deep": "linear-gradient(135deg, #0B2F55 0%, #0B5D73 50%, #4C1D95 100%)",
        "gradient-emerald": "linear-gradient(135deg, #16A34A 0%, #0E7C5A 100%)",
        "gradient-violet": "linear-gradient(135deg, #7C3AED 0%, #1E3A8A 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
