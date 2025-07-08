import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	plugins: [
		sveltekit(),
		// Bundle analysis - generates stats.html after build
		visualizer({
			filename: './build-stats.html',
			open: false, // Don't auto-open in browser
			gzipSize: true,
			brotliSize: true,
			template: 'treemap' // Options: sunburst, treemap, network
		})
	],
	optimizeDeps: {
		include: ['mermaid'],
		exclude: []
	},
	build: {
		target: 'esnext',
		// Enable better code splitting
		rollupOptions: {
			output: {
				// Create a separate chunk for Mermaid
				manualChunks: (id) => {
					if (id.includes('mermaid')) {
						return 'mermaid';
					}
					// Keep vendor chunks separate
					if (id.includes('node_modules')) {
						// Further split vendor chunks by package
						if (id.includes('svelte')) return 'svelte';
						if (id.includes('shiki')) return 'shiki';
						return 'vendor';
					}
				},
				// Use dynamic imports for better chunk naming
				chunkFileNames: (chunkInfo) => {
					return `chunks/${chunkInfo.name}-[hash].js`;
				}
			}
		},
		// Increase chunk size warning limit for Mermaid
		chunkSizeWarningLimit: 600
	},
	resolve: {
		alias: {
			// Point to the ESM version of mermaid
			mermaid: 'mermaid/dist/mermaid.esm.min.mjs'
		}
	}
});
