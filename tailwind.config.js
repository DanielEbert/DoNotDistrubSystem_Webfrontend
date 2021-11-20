module.exports = {
  purge: ["./src/*.js", "./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false,
  theme: {
    fontFamily: { sans: ["Poppins"] },
    extend: {},
  },
  variants: {
    extend: {
      backgroundOpacity: ["active"],
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
