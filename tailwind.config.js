/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./index.html"], 
  theme: {
    extend: {},
  },
  plugins: [],
};


// npx @tailwindcss/cli -i style.css -o output.css --minify --node-env production