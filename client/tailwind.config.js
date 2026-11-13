/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Clinical-but-warm palette: deep navy text, teal-mint brand accent,
        // cool off-white canvas. ("lime" is kept as the token name for the brand accent.)
        paper: '#F3F7F9',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#0B2239', 2: '#2E4459', 3: '#5F7385', 4: '#9AABB9' },
        line: { DEFAULT: '#E1E8EE', soft: '#EDF2F5' },
        lime: { DEFAULT: '#2DD4BF', soft: '#DDF7F2', deep: '#0F766E' },
        brand: { DEFAULT: '#0F766E', 600: '#0D9488', 400: '#2DD4BF', 100: '#CCFBF1', 50: '#F0FDFA' },
        sky: { DEFAULT: '#2F80ED', soft: '#E3EFFD' },
        coral: { DEFAULT: '#FF7A6B', soft: '#FFE9E5' },
        ok: { DEFAULT: '#14866D', soft: '#DCF5EC' },
        warn: { DEFAULT: '#B45309', soft: '#FEF1DC' },
        bad: { DEFAULT: '#D63A44', soft: '#FDE7E9' },
        info: { DEFAULT: '#2F6FE0', soft: '#E3EDFC' },
        tint: {
          lime: '#C9F2EA', sky: '#D4E6FF', peach: '#FFDCCD', lilac: '#E4DEFF',
          mint: '#CDEFE0', sun: '#FFF0BF', rose: '#FFD8E1', sand: '#EAE3D6',
        },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Geist', 'ui-sans-serif', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 0 rgba(11,34,57,0.03), 0 1px 3px rgba(11,34,57,0.05)',
        pop: '0 14px 36px -10px rgba(11,34,57,0.22), 0 2px 6px rgba(11,34,57,0.06)',
        ring: '0 0 0 4px rgba(45,212,191,0.35)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up .25s ease-out both',
        'fade-in': 'fade-in .2s ease-out both',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
