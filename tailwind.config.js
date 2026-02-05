/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--c-bg)',
        sidebar: 'var(--c-surface)',
        foreground: 'var(--c-text)',
        dim: 'var(--c-text)',
        muted: 'var(--c-muted)',
        primary: 'var(--c-primary)',
        secondary: 'var(--c-secondary)',
        card: 'var(--bg-card)', // Keeping bg-card as it has opacity
        input: 'var(--bg-input)', // Keeping bg-input for opacity
        surface1: 'var(--bg-surface-1)',
        surface2: 'var(--bg-surface-2)',
        'spring-pink': 'var(--c-primary)',
        'spring-blue': 'var(--c-secondary)',
      },
      fontFamily: {
        en: ['var(--font-en)'],
        jp: ['var(--font-jp)'],
        title: ['var(--font-title)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
