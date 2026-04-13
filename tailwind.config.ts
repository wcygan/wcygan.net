import typography from '@tailwindcss/typography'
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{html,js,jsx,tsx,ts,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            p: {
              fontSize: {
                base: '1rem',
                lg: '1.175rem',
              },
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-headings': 'rgb(92, 139, 63)',
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            p: {
              fontSize: {
                base: '1rem',
                lg: '1.175rem',
              },
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config
