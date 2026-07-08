import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0d", // base background (near-black)
        surface: "#141416", // panels / cards
        bone: "#f2f0eb", // primary warm off-white text (and inverted buttons)
        live: "#22c55e", // green — live / under-market / go
        "live-ink": "#04210f", // text on a green chip
        gold: {
          DEFAULT: "#f0c94a", // the SNAG win
          deep: "#d69e1a",
          light: "#fbe9a8",
          ink: "#1a1405", // text on gold
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-archivo)", "var(--font-inter)", "sans-serif"],
      },
      // Exact opacity steps the design leans on, so text-bone/45 etc. resolve.
      opacity: {
        3: "0.03",
        4: "0.04",
        12: "0.12",
        14: "0.14",
        16: "0.16",
        18: "0.18",
        28: "0.28",
        35: "0.35",
        38: "0.38",
        45: "0.45",
        55: "0.55",
        62: "0.62",
        65: "0.65",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        snagpulse: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        marquee: "marquee 34s linear infinite",
        snagpulse: "snagpulse 1.6s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
