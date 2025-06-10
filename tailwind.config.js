/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx", // Adicionar App.tsx na raiz
    "./constants.tsx", // Adicionar constants.tsx na raiz
    "./types.ts", // Adicionar types.ts na raiz
    "./contexts/**/*.{js,ts,jsx,tsx}", // Assumindo que contexts está na raiz
    "./components/**/*.{js,ts,jsx,tsx}", // Assumindo que components está na raiz
    "./pages/**/*.{js,ts,jsx,tsx}", // Assumindo que pages está na raiz
    "./services/**/*.{js,ts,jsx,tsx}", // Assumindo que services está na raiz
    // Adicione outros arquivos/pastas na raiz que contenham classes Tailwind
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary-DEFAULT)', 
          light: 'var(--color-primary-light)',   
          dark: 'var(--color-primary-dark)',    
        },
        secondary: { 
          DEFAULT: 'var(--color-secondary-DEFAULT)', 
          light: 'var(--color-secondary-light)',   
          dark: 'var(--color-secondary-dark)',    
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