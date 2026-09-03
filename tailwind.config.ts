import type { Config } from "tailwindcss";

/** color(var) helper so `bg-primary/50` opacity utilities work with RGB-channel vars */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        background: c("--background"),
        surface: c("--surface"),
        foreground: c("--foreground"),
        border: c("--border"),
        input: c("--border"),
        ring: c("--ring"),
        primary: { DEFAULT: c("--primary"), strong: c("--primary-strong"), foreground: c("--on-primary") },
        secondary: { DEFAULT: c("--secondary"), foreground: c("--on-secondary") },
        success: { DEFAULT: c("--success"), foreground: c("--on-success") },
        info: { DEFAULT: c("--info"), foreground: c("--on-info") },
        muted: { DEFAULT: c("--muted"), foreground: c("--muted-foreground") },
        destructive: { DEFAULT: c("--destructive"), foreground: c("--on-destructive") },
        card: { DEFAULT: c("--surface"), foreground: c("--foreground") },
        popover: { DEFAULT: c("--surface"), foreground: c("--foreground") },
        accent: { DEFAULT: c("--muted"), foreground: c("--foreground") },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(41 37 36 / 0.04), 0 4px 16px rgb(41 37 36 / 0.06)",
        "soft-md": "0 2px 4px rgb(41 37 36 / 0.05), 0 8px 28px rgb(41 37 36 / 0.08)",
        "soft-lg": "0 8px 40px rgb(41 37 36 / 0.12)",
        glow: "0 8px 30px rgb(239 108 87 / 0.28)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        // centered dialogs: keep the centering translate inside the keyframe so the
        // animation's transform doesn't clobber it (otherwise the modal drops off-center).
        "dialog-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "pop": { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.06)" }, "100%": { transform: "scale(1)" } },
        "float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "shimmer": { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out both",
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.2s ease-out both",
        "dialog-in": "dialog-in 0.2s ease-out both",
        "pop": "pop 0.3s ease-out",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
