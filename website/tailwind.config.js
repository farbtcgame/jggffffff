/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Origin Punk neon-void palette
        neon: "#CCFF00",
        "neon-dim": "rgba(204, 255, 0, 0.45)",
        cyan: "#7FE7D8",
        void: {
          DEFAULT: "#0A0B0D",
          card: "#141519",
          card2: "#1A1C21",
          border: "rgba(255,255,255,0.09)",
        },
        // kept for any legacy references
        terminal: {
          bg: "#0B0D0F",
          card: "#0f1115",
          border: "#27272a",
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(204,255,0,0.25), 0 8px 40px -8px rgba(204,255,0,0.35)",
        soft: "0 20px 60px -24px rgba(0,0,0,0.8)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(204,255,0,0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(204,255,0,0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        marquee: "marquee 34s linear infinite",
        "pulse-glow": "pulseGlow 2.6s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
