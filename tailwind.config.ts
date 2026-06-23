import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GTA 6 Vice City palette
        neon: {
          pink: "#FF2D7B",
          pinkBright: "#FF4F94",
          orange: "#FF7A3C",
          orangeBright: "#FF9A4D",
          teal: "#1FE0D8",
          blue: "#2BB8FF",
          purple: "#A855F7",
        },
        vice: {
          night: "#0B0420",      // deep purple-black background
          midnight: "#160A33",   // panel base
          dusk: "#2A1252",       // elevated panel
          sunset: "#FF6B6B",     // accent gradient stop
        },
        ink: "#F5F3FF",          // primary text (near-white violet)
        muted: "#B8A9D9",        // secondary text
      },
      fontFamily: {
        // Art-deco italic display for headers; clean sans for body
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "vice-sunset":
          "linear-gradient(180deg, #2A1252 0%, #4B1F6B 30%, #FF2D7B 70%, #FF7A3C 100%)",
        "neon-pink-orange":
          "linear-gradient(135deg, #FF2D7B 0%, #FF7A3C 100%)",
        "neon-teal-blue":
          "linear-gradient(135deg, #1FE0D8 0%, #2BB8FF 100%)",
        "vice-grid":
          "linear-gradient(rgba(43,184,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(43,184,255,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "neon-pink": "0 0 12px rgba(255,45,123,0.7), 0 0 32px rgba(255,45,123,0.4)",
        "neon-teal": "0 0 12px rgba(31,224,216,0.7), 0 0 32px rgba(31,224,216,0.4)",
        "neon-orange": "0 0 12px rgba(255,122,60,0.7), 0 0 32px rgba(255,122,60,0.4)",
        glass: "0 8px 32px rgba(0,0,0,0.5)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "neon-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "gradient-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "float-up": {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease infinite",
        "float-up": "float-up 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
