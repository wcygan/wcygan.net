import { preview } from 'vite';
import type { PreviewServer } from 'vite';
import { loadConfigFromFile } from 'vite';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
// import { launchBrowser, closeBrowser } from './browserUtils'; // Unused imports

const execAsync = promisify(exec);

let server: PreviewServer | null = null;

/**
 * Wait for the server to be ready by making HTTP requests
 * @param baseUrl - The base URL to check
 * @param timeoutMs - Timeout in milliseconds
 */
async function waitForServer(baseUrl: string, timeoutMs: number = 30000): Promise<void> {
	const startTime = Date.now();
	const checkInterval = 500; // Check every 500ms

	while (Date.now() - startTime < timeoutMs) {
		try {
			// Use built-in fetch (Node.js 18+) or fallback to http module
			let response;

			if (typeof globalThis.fetch !== 'undefined') {
				// Use built-in fetch
				response = await globalThis.fetch(baseUrl, {
					method: 'GET',
					signal: AbortSignal.timeout(5000) // 5 second timeout
				});

				if (response.ok) {
					console.log(`Server is ready at ${baseUrl}`);
					return;
				}
			} else {
				// Fallback to http module
				const http = await import('http');
				const url = new URL(baseUrl);

				await new Promise<void>((resolve, reject) => {
					const req = http.get(
						{
							hostname: url.hostname,
							port: url.port,
							path: url.pathname,
							timeout: 5000
						},
						(res) => {
							if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
								console.log(`Server is ready at ${baseUrl}`);
								resolve();
								return;
							}
							reject(new Error(`HTTP ${res.statusCode}`));
						}
					);

					req.on('error', reject);
					req.on('timeout', () => {
						req.destroy();
						reject(new Error('Request timeout'));
					});
				});

				return; // Server is ready
			}
		} catch {
			// Server not ready yet, continue waiting
		}

		await new Promise((resolve) => setTimeout(resolve, checkInterval));
	}

	throw new Error(`Server failed to start within ${timeoutMs}ms`);
}

// Environment variable to store the base URL
// We use process.env instead of global since globalSetup runs in different process

async function setup() {
	console.log('Starting Vite preview server for integration tests...');

	try {
		// Check if build directory exists, if not build the project
		if (!existsSync('./build')) {
			console.log('Build directory not found, building project...');
			await execAsync('npm run build');
		}

		// Load the Vite config
		const configResult = await loadConfigFromFile(
			{ command: 'serve', mode: 'production' },
			'./vite.config.ts'
		);

		if (!configResult) {
			throw new Error('Failed to load Vite config');
		}

		// Start the preview server on port 4173
		server = await preview({
			...configResult.config,
			preview: {
				port: 4173,
				host: 'localhost',
				open: false,
				strictPort: true // Fail if port is already in use
			},
			logLevel: 'warn' // Reduce noise in test output
		});

		// Set the base URL in environment variable
		process.env.VITE_TEST_BASE_URL = 'http://localhost:4173';

		console.log(`Preview server started at ${process.env.VITE_TEST_BASE_URL}`);

		// Wait for the HTTP listener to be ready by making a health check
		await waitForServer(process.env.VITE_TEST_BASE_URL, 30000);

		// Return teardown function
		return teardown;
	} catch (error) {
		console.error('Failed to start preview server:', error);
		throw error;
	}
}

async function teardown() {
	console.log('Shutting down Vite preview server...');

	if (server) {
		try {
			await server.close();
			server = null;
			console.log('Preview server closed successfully');
		} catch (error) {
			console.error('Error closing preview server:', error);
		}
	}

	// Clean up environment variable
	delete process.env.VITE_TEST_BASE_URL;
}

// Export the server instance for tests that might need direct access
export { server };

// Export setup function as default for Vitest global setup
export default setup;
