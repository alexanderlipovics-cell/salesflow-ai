/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "#020617",
          surface: "#0f172a",
          card: "#1e293b",
          "card-hover": "#334155",
          border: "#334155",
          "border-subtle": "#475569",
          text: "#f1f5f9",
          "text-muted": "#94a3b8",
          "text-subtle": "#64748b",
          primary: "#06b6d4",
          "primary-dark": "#0891b2",
          accent: "#a3e635",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      boxShadow: {
        "sf-sm": "0 2px 6px rgba(6, 182, 212, 0.08)",
        "sf-md": "0 10px 25px rgba(6, 182, 212, 0.12)",
        "sf-lg": "0 20px 45px rgba(6, 182, 212, 0.18)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
