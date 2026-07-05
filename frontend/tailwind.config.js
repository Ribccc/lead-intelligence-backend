/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",  // Premium light-neutral background
        surface: "#FFFFFF",     // Pure white cards and panels
        "surface-bright": "#FFFFFF",
        "surface-container": "#F1F5F9",
        "surface-container-low": "#F8FAFC",
        "border-subtle": "#E2E8F0", // Slate-200 clean borders
        primary: "#0070f3",     // Electric Blue
        "primary-container": "#EFF6FF", // Light-blue active highlights
        "ai-purple": "#7928ca",  // Vibrant Violet (AI Layer)
        "status-success": "#10B981",
        "on-background": "#0F172A", // Dark Slate-900 high contrast text
        "on-surface": "#1E293B",     // Slate-800 text
        "on-surface-variant": "#64748B", // Muted Slate-500 text
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "24px",
      }
    },
  },
  plugins: [],
}
