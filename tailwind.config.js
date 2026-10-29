/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        navy: '#0B1220',
        midnight: '#111C32',
        teal: { DEFAULT: '#14B8A6', 600: '#0D9488' },
        softblue: '#60A5FA',
        mist: '#F3F6FA',
        ok: '#16A34A',
        warn: '#D97706',
        bad: '#DC2626',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,18,32,0.04), 0 4px 16px rgba(11,18,32,0.06)',
        lift: '0 2px 4px rgba(11,18,32,0.05), 0 12px 32px rgba(11,18,32,0.12)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        slideIn: { '0%': { transform: 'translateX(24px)', opacity: 0 }, '100%': { transform: 'none', opacity: 1 } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease-out both',
        slideIn: 'slideIn .3s ease-out both',
        shimmer: 'shimmer 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};
