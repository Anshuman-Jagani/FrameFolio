/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Luxury Elegance Palette
        cream: {
          50:  '#faf8f6',
          100: '#f1ece6',
          200: '#e8e0d8',
        },
        taupe: {
          100: '#ddd5cd',
          300: '#c8bcb2',
          500: '#b6a697',
          700: '#8f7d6e',
        },
        burgundy: {
          50:  '#f5eaeb',
          100: '#e8c9cb',
          400: '#a75560',
          500: '#7d4047',
          600: '#6a3540',
          700: '#562b34',
        },
        charcoal: {
          500: '#4a4a4a',
          700: '#2e2e2e',
          900: '#1a1a1a',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


