module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        board: "0 20px 60px -30px rgba(15, 23, 42, 0.45)"
      }
    }
  },
  plugins: []
};
