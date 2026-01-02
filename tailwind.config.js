/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          950: "#0a0a12",
        },
        bg: {
          primary: "#141420",
          secondary: "#0f0f18",
          tertiary: "#0a0a10",
          hover: "#252535",
        },
        // Catppuccin Mocha surface colors for consistent theming
        surface: {
          crust: "#11111b",
          mantle: "#181825",
          base: "#1e1e2e",
          0: "#313244",
          1: "#45475a",
          2: "#585b70",
        },
        // Catppuccin Mocha overlay/text colors
        overlay: {
          0: "#6c7086",
          1: "#7f849c",
          2: "#9399b2",
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
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.3" },
          "50%": { transform: "scale(1.5)", opacity: "0.6" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "shimmer-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "shimmer-rotate": "shimmer-rotate 3s linear infinite",
      },
    },
  },
  plugins: [],
};
