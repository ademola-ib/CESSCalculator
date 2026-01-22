import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./app/**/*.{ts,tsx,mdx}",
    "./content/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(217 19% 25%)",
        input: "hsl(217 19% 25%)",
        ring: "hsl(212 92% 55%)",
        background: "hsl(222 47% 11%)",
        foreground: "hsl(213 31% 91%)",
        primary: {
          DEFAULT: "hsl(212 92% 55%)",
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(217 19% 18%)",
          foreground: "hsl(213 31% 91%)",
        },
        destructive: {
          DEFAULT: "hsl(0 63% 50%)",
          foreground: "hsl(0 0% 100%)",
        },
        muted: {
          DEFAULT: "hsl(217 19% 18%)",
          foreground: "hsl(215 16% 57%)",
        },
        accent: {
          DEFAULT: "hsl(188 94% 43%)",
          foreground: "hsl(0 0% 100%)",
        },
        card: {
          DEFAULT: "hsl(217 19% 15%)",
          foreground: "hsl(213 31% 91%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
