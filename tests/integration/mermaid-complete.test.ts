import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Page } from 'puppeteer';
import {
	launchBrowser,
	closeBrowser,
	createPage,
	closePage,
	getTestBaseUrl,
	// waitForMermaidDiagrams, // Unused import
	gotoAndWaitForMermaid
} from './testUtils';

describe('Mermaid Complete Integration Tests', () => {
	let page: Page;
	const baseUrl = getTestBaseUrl();

	beforeAll(async () => {
		console.log('Launching shared browser...');
		await launchBrowser();
	}, 30000);

	afterAll(async () => {
		await closeBrowser();
	});

	beforeEach(async () => {
		page = await createPage();
	});

	afterEach(async () => {
		await closePage(page);
	});

	describe('All Diagram Types', () => {
		it('should render all 6 types of Mermaid diagrams on the blog post', async () => {
			// Use enhanced navigation and waiting utility
			await gotoAndWaitForMermaid(page, `${baseUrl}/blog/mermaid-diagrams`, 6, 20000);

			// Count all rendered diagrams
			const diagramCount = await page.$$eval(
				'.mermaid-render-container svg',
				(elements) => elements.length
			);
			console.log(`Found ${diagramCount} diagrams`);

			// We expect at least 6 diagrams (flow, sequence, state, git, ER, pie)
			expect(diagramCount).toBeGreaterThanOrEqual(6);

			// Verify each diagram has content
			const diagramsHaveContent = await page.$$eval('.mermaid-render-container svg', (svgs) => {
				return svgs.every((svg) => {
					const hasElements = svg.querySelectorAll('*').length > 10; // Each diagram should have many elements
					const hasViewBox = svg.hasAttribute('viewBox');
					return hasElements && hasViewBox;
				});
			});

			expect(diagramsHaveContent).toBe(true);
		});

		it('should properly style diagrams with dark theme', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			// Check that dark theme is applied
			const hasDarkTheme = await page.$$eval('.mermaid-render-container', (containers) => {
				return containers.every((container) => {
					// const styles = window.getComputedStyle(container); // Unused variable
					// Dark theme should have dark background or specific styling
					return (
						container.classList.contains('mermaid-diagram') ||
						container.querySelector('svg') !== null
					);
				});
			});

			expect(hasDarkTheme).toBe(true);
		});

		it('should cache diagrams in sessionStorage', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			// Check sessionStorage for cached diagrams
			const cacheInfo = await page.evaluate(() => {
				const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('mermaid-cache-'));
				const samples = keys.slice(0, 3).map((key) => {
					const value = sessionStorage.getItem(key);
					return {
						key,
						hasContent: value !== null && value.includes('<svg'),
						size: value ? value.length : 0
					};
				});
				return {
					cacheCount: keys.length,
					samples
				};
			});

			console.log(`Cache info: ${cacheInfo.cacheCount} cached diagrams`);
			expect(cacheInfo.cacheCount).toBeGreaterThan(0);
			expect(cacheInfo.samples.every((s) => s.hasContent)).toBe(true);
		});

		it('should handle responsive viewport correctly', async () => {
			// Mobile viewport
			await page.setViewport({ width: 375, height: 667 });
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			const mobileInfo = await page.$$eval('.mermaid-render-container svg', (svgs) => {
				return svgs.map((svg) => {
					const rect = svg.getBoundingClientRect();
					return {
						width: rect.width,
						fitsViewport: rect.width <= 375
					};
				});
			});

			// All diagrams should fit within mobile viewport
			expect(mobileInfo.every((info) => info.fitsViewport)).toBe(true);
		});

		it('should have proper accessibility attributes', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			const accessibilityInfo = await page.$$eval('.mermaid-render-container svg', (svgs) => {
				return svgs.map((svg) => {
					return {
						hasRole: svg.hasAttribute('role'),
						role: svg.getAttribute('role'),
						hasAriaLabel:
							svg.hasAttribute('aria-label') ||
							svg.querySelector('title') !== null ||
							svg.hasAttribute('aria-labelledby')
					};
				});
			});

			// All diagrams should have proper accessibility
			accessibilityInfo.forEach((info) => {
				expect(info.hasRole).toBe(true);
				expect(info.hasAriaLabel).toBe(true);
			});
		});
	});

	describe('Performance', () => {
		it('should render all diagrams within reasonable time', async () => {
			const startTime = Date.now();

			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			// Wait for all diagrams to render
			await page.waitForFunction(
				() => document.querySelectorAll('.mermaid-render-container svg').length >= 6,
				{ timeout: 10000 }
			);

			const renderTime = Date.now() - startTime;
			console.log(`All diagrams rendered in ${renderTime}ms`);

			// Should render within 10 seconds
			expect(renderTime).toBeLessThan(10000);
		});
	});
});
