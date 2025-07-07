import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'node',
		globals: true,
		include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
		testTimeout: 45000, // Increased for Mermaid rendering
		hookTimeout: 60000, // Increased for server startup and browser launch
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true
			}
		},
		globalSetup: ['./tests/integration/globalServer.ts'],
		setupFiles: ['./tests/integration/globalServer.ts']
	},
	define: {
		'process.env.BASE_URL': 'global.__BASE_URL__'
	},
	resolve: {
		alias: {
			mermaid: 'mermaid/dist/mermaid.esm.min.mjs'
		}
	}
});
