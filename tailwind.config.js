/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B1426",
          800: "#111D35",
          700: "#162544",
        },
        gold: {
          DEFAULT: "#C9A84C",
          dim: "rgba(201,168,76,0.15)",
          text: "#E8D48B",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Helvetica Neue"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
