import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Page } from 'puppeteer';
import { launchBrowser, closeBrowser, createPage, closePage, getTestBaseUrl } from './testUtils';

describe('Mermaid Diagrams Integration Tests (Simple)', () => {
	let page: Page;
	const baseUrl = getTestBaseUrl();

	beforeAll(async () => {
		// Launch shared browser instance
		await launchBrowser();
	}, 30000);

	afterAll(async () => {
		// Close shared browser instance
		await closeBrowser();
	});

	it('should load the mermaid diagrams page', async () => {
		page = await createPage();
		try {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			const title = await page.title();
			expect(title).toContain('Mermaid');
		} finally {
			await closePage(page);
		}
	});

	it('should render mermaid diagrams', async () => {
		page = await createPage();
		try {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			// Wait for diagrams to render
			await page.waitForSelector('.mermaid-render-container svg', { timeout: 10000 });

			// Count rendered diagrams
			const diagramCount = await page.$$eval(
				'.mermaid-render-container svg',
				(elements) => elements.length
			);
			expect(diagramCount).toBeGreaterThan(0);
		} finally {
			await closePage(page);
		}
	});
});
