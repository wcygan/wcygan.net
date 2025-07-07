import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Page } from 'puppeteer';
import { getTestBaseUrl, launchBrowser, closeBrowser, createPage, closePage } from './testUtils';

describe('Global Server Setup Example', () => {
	let page: Page;

	beforeAll(async () => {
		// Launch shared browser instance
		await launchBrowser();
	});

	afterAll(async () => {
		// Close shared browser instance
		await closeBrowser();
	});

	beforeEach(async () => {
		// Create new page from shared browser
		page = await createPage();
	});

	afterEach(async () => {
		// Close page
		await closePage(page);
	});

	it('should access the base URL from helper utility', async () => {
		// Use the helper utility to get the base URL
		const baseUrl = getTestBaseUrl();
		expect(baseUrl).toBe('http://localhost:4173');

		console.log(`Using base URL: ${baseUrl}`);

		// Navigate to the home page
		await page.goto(baseUrl, { waitUntil: 'networkidle2' });

		// Verify the page loads successfully
		const title = await page.title();
		console.log(`Page title: ${title}`);

		// Check that the page has content (title might be empty for some pages)
		const hasContent = await page.$eval('body', (el) => el.textContent?.length || 0);
		expect(hasContent).toBeGreaterThan(0);
	});

	it('should serve static assets', async () => {
		const baseUrl = getTestBaseUrl();

		// Test that we can access the site
		await page.goto(baseUrl, { waitUntil: 'networkidle2' });

		// Check that the page has loaded properly
		const bodyContent = await page.$eval('body', (el) => el.textContent?.length || 0);
		expect(bodyContent).toBeGreaterThan(0);
	});
});
