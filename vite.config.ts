import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['mermaid'],
		exclude: []
	},
	build: {
		target: 'esnext'
	},
	resolve: {
		alias: {
			// Point to the ESM version of mermaid
			mermaid: 'mermaid/dist/mermaid.esm.min.mjs'
		}
	}
});
