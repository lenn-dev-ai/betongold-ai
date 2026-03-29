// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#08090d',
        s1: '#0f1117',
        s2: '#161b23',
        s3: '#1d2330',
        border: '#1f2633',
        border2: '#2a3344',
        gold: '#c9a84c',
        gold2: '#dfc06a',
        'gold-dim': '#7a621e',
        text: '#e4e0d8',
        muted: '#5a6478',
        muted2: '#8590a6',
        success: '#3ecf8e',
        danger: '#f76b6b',
        warning: '#f0b429',
        info: '#4b8ef0',
      },
      fontFamily: {
        sans:  ['var(--font-sans)', 'DM Sans', 'sans-serif'],
        mono:  ['var(--font-mono)', 'DM Mono', 'monospace'],
        serif: ['var(--font-serif)', 'Playfair Display', 'serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        none: '0px',
        sm: '2px',
        md: '4px',
      },
      backgroundImage: {
        'app-gradient': `
          radial-gradient(ellipse 70% 50% at 90% -10%, rgba(201,168,76,.05) 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at -5% 110%, rgba(75,142,240,.04) 0%, transparent 60%)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
