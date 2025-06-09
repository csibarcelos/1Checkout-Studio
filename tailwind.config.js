/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary-DEFAULT)', // #FDE047 (yellow-400)
          light: 'var(--color-primary-light)',   // #FEF08A (yellow-200)
          dark: 'var(--color-primary-dark)',    // #FACC15 (yellow-500)
        },
        secondary: { 
          DEFAULT: 'var(--color-secondary-DEFAULT)', // #22C55E (green-500)
          light: 'var(--color-secondary-light)',   // #86EFAC (green-300)
          dark: 'var(--color-secondary-dark)',    // #15803D (green-700)
        },
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}