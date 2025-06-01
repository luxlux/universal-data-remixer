/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.tsx",
  ],
  theme: {
    extend: {
      colors: {
        'amazon-orange': '#FF9900',
        'amazon-orange-hover': '#E68A00',
        'amazon-dark-blue': '#131A22',
        'amazon-medium-blue': '#232F3E',
        'amazon-light-grey': '#4A596D',
        'amazon-cyan': '#007B99',
      }
    },
    fontFamily: {
      sans: ['"Amazon Ember"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
    },
  },
  plugins: [],
}