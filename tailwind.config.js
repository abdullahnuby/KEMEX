/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Alexandria', 'system-ui', 'sans-serif'] },
      colors: {
        primary: {
          50: '#eef7fd', 100: '#dceefb', 200: '#bddcf3', 300: '#8ec4eb', 400: '#4aa6df',
          500: '#0878d1', 600: '#076ab9', 700: '#073b68', 800: '#062f54', 900: '#052640', 950: '#031a2d',
        },
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        neutral: '#64748b',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
}
