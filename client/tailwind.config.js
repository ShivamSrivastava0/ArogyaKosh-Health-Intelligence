/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F1',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#121212', 2: '#3A3A36', 3: '#6B6B65', 4: '#A2A29B' },
        line: { DEFAULT: '#E7E5DE', soft: '#F0EEE8' },
        lime: { DEFAULT: '#D4F25A', soft: '#EFF9C9', deep: '#4F6B00' },
        ok: { DEFAULT: '#1E8E4E', soft: '#E2F4E8' },
        warn: { DEFAULT: '#B86E00', soft: '#FFF0D3' },
        bad: { DEFAULT: '#D0372A', soft: '#FDE6E2' },
        info: { DEFAULT: '#2D63D8', soft: '#E4ECFC' },
        tint: {
          lime: '#E6F7A6', sky: '#CFE4FF', peach: '#FFD9C2', lilac: '#E3D9FF',
          mint: '#C9F0DC', sun: '#FFEDA6', rose: '#FFD3DE', sand: '#ECE2D0',
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
        card: '0 1px 0 rgba(18,18,18,0.03), 0 1px 3px rgba(18,18,18,0.04)',
        pop: '0 12px 32px -8px rgba(18,18,18,0.18), 0 2px 6px rgba(18,18,18,0.06)',
        ring: '0 0 0 4px rgba(212,242,90,0.55)',
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
