/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        strip: 'var(--color-strip)',
        wire: 'var(--color-wire)',
        component: 'var(--color-component)',
        pin: 'var(--color-pin)',
        grid: 'var(--color-grid)',
        ratsnest: 'var(--color-ratsnest)',
      },
      spacing: {
        'grid': 'var(--grid-pitch)',
      },
    },
  },
  plugins: [],
}
