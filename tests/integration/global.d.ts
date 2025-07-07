// Global type declarations for integration tests

import type { Browser } from 'puppeteer';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			VITE_TEST_BASE_URL?: string;
		}
	}

	const __BROWSER__: Browser | undefined;
	const __BASE_URL__: string | undefined;
}

export {};
