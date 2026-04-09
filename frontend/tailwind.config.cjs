/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nature & Earth Palette
        parchment: {
          50:  '#faf9f7',
          100: '#f4f1ed',  // Parchment – lightest bg
          200: '#e7e1d8',  // Soft Linen – secondary bg / borders
        },
        olive: {
          400: '#8b8f7a',
          500: '#6b705c',  // Dusty Olive – primary accent
          600: '#575c4a',
          700: '#424639',
        },
        copper: {
          300: '#c4ab8e',
          400: '#b89578',
          500: '#a98467',  // Faded Copper – secondary accent / muted text
          600: '#8e6e54',
          700: '#725742',
        },
        pine: {
          50:  '#eaf0ec',
          100: '#c4d5c9',
          400: '#4e7460',
          500: '#3d6150',
          600: '#344e41',  // Pine Teal – dark accent / CTA
          700: '#283d33',
          800: '#1d2e26',
        },
        // Keep charcoal for text
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



