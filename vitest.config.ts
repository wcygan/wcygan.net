import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		exclude: ['tests/integration/**/*', '**/node_modules/**'],
		testTimeout: 20000, // Increased for Mermaid rendering in component tests
		hookTimeout: 30000 // Increased for setup/teardown operations
	},
	resolve: {
		alias: {
			mermaid: 'mermaid/dist/mermaid.esm.min.mjs'
		}
	}
});
