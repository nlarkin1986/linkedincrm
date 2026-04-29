import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./tests/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gladly: {
          green: "#009b00",
          "green-hover": "#008000",
          park: "#64B964",
          "park-light": "#D8F4D8",
          wood: "#006400",
          purple: "#8C69F0",
          yellow: "#ffe01e",
          page: "#FAFAFA"
        }
      },
      borderRadius: {
        gladly: "0.375rem"
      }
    }
  },
  plugins: []
};

export default config;
