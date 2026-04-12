/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(0 0% 10%)',
        secondary: 'hsl(45 70% 50%)',
        accent: 'hsl(45 90% 55%)',
        muted: 'hsl(0 0% 45%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
