import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      // Panel breakpoint for desktop layout activation
      panel: "1100px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-cinzel)", "Georgia", "serif"],
        heading: ["var(--font-cinzel)", ...defaultTheme.fontFamily.serif],
        mono: ["JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // MetaDJ App Visual System - Canonical OKLCH Tokens
        metadj: {
          // Primary Tier
          purple: "var(--metadj-purple)",
          cyan: "var(--metadj-cyan)",
          magenta: "var(--metadj-magenta)",
          // Secondary Tier
          indigo: "var(--metadj-indigo)",
          blue: "var(--metadj-blue)",
          emerald: "var(--metadj-emerald)",
          red: "var(--metadj-red)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Semantic border-radius utilities (see globals.css)
        panel: "var(--radius-panel)",    // 18px - media panels, overlays, queue
        card: "var(--radius-card)",      // 22px - cards, control surfaces
        modal: "var(--radius-modal)",    // 28px - dialogs, modals
        hero: "var(--radius-hero)",      // 30px - welcome overlays, hero features
      },
      zIndex: {
        100: "100",
      },
      boxShadow: {
        glass: "0 12px 36px rgba(18, 15, 45, 0.45)",
        neon: "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-purple": "var(--shadow-glow-purple)",
        "glow-cyan": "var(--shadow-glow-cyan)",
        "glow-emerald": "var(--shadow-glow-emerald)",
        "glow-brand": "var(--shadow-glow-brand)",
        "button": "var(--shadow-button)",
        "button-hover": "var(--shadow-button-hover)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        aurora: {
          "0%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.1)" },
          "100%": { opacity: "0.5", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        shimmer: "shimmer 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        aurora: "aurora 10s ease infinite alternate",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
