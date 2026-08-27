import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0B0D",
        peach: "#FF9B7A",
        coral: "#FF6B8A",
        purple: "#9B5FC0",
        cyan: "#7BE8E8",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #FF9B7A 0%, #FF6B8A 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
