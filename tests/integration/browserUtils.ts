/**
 * Shared browser utility for Puppeteer browser management
 * Consolidates browser launch/close logic and provides shared browser instance
 */

import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

// Type for global object with browser instance
interface GlobalType {
	__BROWSER__?: Browser;
	__BASE_URL__?: string;
}

// Default browser configuration
export const defaultBrowserConfig = {
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox']
};

// Default page viewport
export const defaultViewport = {
	width: 1280,
	height: 720
};

/**
 * Launches a shared browser instance
 * This should be called in beforeAll hooks
 */
export async function launchBrowser(config = defaultBrowserConfig): Promise<Browser> {
	try {
		const browser = await puppeteer.launch(config);
		// Store browser instance globally for shared access
		(global as GlobalType).__BROWSER__ = browser;
		return browser;
	} catch (error) {
		console.error('Failed to launch browser:', error);
		throw error;
	}
}

/**
 * Closes the shared browser instance
 * This should be called in afterAll hooks
 */
export async function closeBrowser(browser?: Browser): Promise<void> {
	const browserToClose = browser || (global as GlobalType).__BROWSER__;
	if (browserToClose) {
		try {
			await browserToClose.close();
			// Clean up global reference
			delete (global as GlobalType).__BROWSER__;
		} catch (error) {
			console.error('Failed to close browser:', error);
		}
	}
}

/**
 * Creates a new page from the shared browser instance
 * Automatically sets the default viewport
 */
export async function createPage(viewport = defaultViewport): Promise<Page> {
	const browser = (global as GlobalType).__BROWSER__ as Browser;

	if (!browser) {
		throw new Error(
			'No browser instance found. Make sure to call launchBrowser() in beforeAll hook.'
		);
	}

	const page = await browser.newPage();
	await page.setViewport(viewport);
	return page;
}

/**
 * Safely closes a page
 */
export async function closePage(page?: Page): Promise<void> {
	if (page) {
		try {
			await page.close();
		} catch (error) {
			console.error('Failed to close page:', error);
		}
	}
}

/**
 * Gets the shared browser instance
 * Useful for tests that need direct browser access
 */
export function getBrowser(): Browser | undefined {
	return (global as GlobalType).__BROWSER__;
}

/**
 * Checks if a browser instance is available
 */
export function hasBrowser(): boolean {
	return !!(global as GlobalType).__BROWSER__;
}
