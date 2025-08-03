import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts,md}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif']
			},
			typography: {
				DEFAULT: {
					css: {
						maxWidth: 'none',
						// Remove backticks from inline code
						'code::before': { content: '""' },
						'code::after': { content: '""' },
						p: {
							fontSize: {
								base: '1rem',
								lg: '1.175rem'
							}
						}
					}
				},
				invert: {
					css: {
						'--tw-prose-headings': 'rgb(92, 139, 63)', // Primary green from design.md
						// Also remove backticks for the invert theme
						'code::before': { content: '""' },
						'code::after': { content: '""' },
						p: {
							fontSize: {
								base: '1rem',
								lg: '1.175rem'
							}
						}
					}
				}
			}
		}
	},
	plugins: [typography]
} satisfies Config;
