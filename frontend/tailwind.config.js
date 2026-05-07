/** @type {import('tailwindcss').Config} */
import lineClamp from '@tailwindcss/line-clamp';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Use class strategy for dark mode
  theme: {
    extend: {
      screens: {
        'xs': '475px', // Extra small devices
      },
    },
  },
  plugins: [lineClamp],
};
