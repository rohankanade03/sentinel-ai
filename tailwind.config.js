export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        mist: "#f5f7fb",
        line: "#e4e9f2",
      },
      boxShadow: {
        premium: "0 22px 60px rgba(29, 41, 57, 0.10)",
        lift: "0 16px 38px rgba(29, 41, 57, 0.12)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
