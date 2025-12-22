/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#141420",
          secondary: "#0f0f18",
          tertiary: "#0a0a10",
          hover: "#252535",
        },
        text: {
          primary: "#cdd6f4",
          secondary: "#a6adc8",
          accent: "#89b4fa",
        },
        border: "#2a2a3a",
        accent: {
          DEFAULT: "#cba6f7",
          purple: "#cba6f7",
          green: "#a6e3a1",
          red: "#f38ba8",
          yellow: "#f9e2af",
          blue: "#89b4fa",
          cyan: "#94e2d5",
          pink: "#f5c2e7",
          orange: "#fab387",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.75rem" }],
      },
    },
  },
  plugins: [],
};
