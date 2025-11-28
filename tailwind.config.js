/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "salesflow-bg": "#0B0F17",
        "salesflow-panel": "#131A24",
        "salesflow-accent": "#00D8A4",
        "salesflow-accent-strong": "#06FFB5",
      },
      boxShadow: {
        glow: "0 15px 45px rgba(0, 216, 164, 0.25)",
      },
    },
  },
  plugins: [],
};
