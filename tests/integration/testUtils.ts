/**
 * Utility functions for integration tests
 */

import type { Page } from 'puppeteer';

// Re-export browser utilities for convenience
export {
	launchBrowser,
	closeBrowser,
	createPage,
	closePage,
	getBrowser,
	hasBrowser,
	defaultBrowserConfig,
	defaultViewport
} from './browserUtils';

/**
 * Get the base URL for the test server
 * This URL is set by the global server setup
 */
export function getTestBaseUrl(): string {
	// Try multiple sources for base URL
	const baseUrl =
		process.env.VITE_TEST_BASE_URL ||
		process.env.BASE_URL ||
		(global as { __BASE_URL__?: string }).__BASE_URL__ ||
		'http://localhost:4173';

	return baseUrl;
}

/**
 * Wait for a specific amount of time
 * Useful for waiting for async operations to complete
 */
export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enhanced waiting utilities for Mermaid diagram rendering
 */

/**
 * Wait for Mermaid diagrams to be rendered with proper timeout and retries
 * @param page - Puppeteer page instance
 * @param expectedCount - Expected number of diagrams (optional)
 * @param timeout - Timeout in milliseconds (default: 15000)
 */
export async function waitForMermaidDiagrams(
	page: Page,
	expectedCount?: number,
	timeout: number = 15000
): Promise<void> {
	const startTime = Date.now();

	// First wait for at least one diagram to appear
	await page.waitForSelector('.mermaid-render-container svg', {
		timeout: timeout,
		visible: true
	});

	// If specific count is expected, wait for that many diagrams
	if (expectedCount !== undefined) {
		await page.waitForFunction(
			(count) => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				return diagrams.length >= (count as number);
			},
			{ timeout: Math.max(timeout - (Date.now() - startTime), 5000) },
			expectedCount
		);
	}

	// Wait for diagrams to be fully rendered (have content)
	await page.waitForFunction(
		() => {
			const diagrams = document.querySelectorAll('.mermaid-render-container svg');
			return Array.from(diagrams).every((svg) => {
				// Check if SVG has actual content (not just empty)
				const hasElements = svg.querySelectorAll('*').length > 5;
				const hasViewBox = svg.hasAttribute('viewBox');
				const hasWidth = svg.getBoundingClientRect().width > 0;
				return hasElements && hasViewBox && hasWidth;
			});
		},
		{ timeout: Math.max(timeout - (Date.now() - startTime), 5000) }
	);
}

/**
 * Wait for a specific Mermaid diagram type to be rendered
 * @param page - Puppeteer page instance
 * @param diagramType - Type of diagram to wait for
 * @param timeout - Timeout in milliseconds (default: 15000)
 */
export async function waitForMermaidDiagramType(
	page: Page,
	diagramType: 'flowchart' | 'sequence' | 'state' | 'git' | 'er' | 'pie',
	timeout: number = 15000
): Promise<void> {
	const selectors = {
		flowchart: '.node, .nodeLabel, [class*="node"], g[id*="flowchart"]',
		sequence: '.actor, .messageLine0',
		state: '.node, .state-group, [class*="state"], g[id*="state"]',
		git: '.commit, .branch',
		er: '.er.entityBox, .entity, [class*="entity"], g[class*="er"]',
		pie: '.pieCircle, .pieTitleText'
	};

	const selector = selectors[diagramType];
	if (!selector) {
		throw new Error(`Unknown diagram type: ${diagramType}`);
	}

	// Wait for the diagram container first
	await page.waitForSelector('.mermaid-render-container svg', { timeout });

	// Then wait for diagram-specific elements
	await page.waitForFunction(
		(sel) => {
			const diagrams = document.querySelectorAll('.mermaid-render-container svg');
			return Array.from(diagrams).some((svg) => svg.querySelectorAll(sel as string).length > 0);
		},
		{ timeout },
		selector
	);
}

/**
 * Wait for page to be fully loaded including all Mermaid diagrams
 * @param page - Puppeteer page instance
 * @param url - URL to navigate to
 * @param expectedDiagramCount - Expected number of diagrams (optional)
 * @param timeout - Timeout in milliseconds (default: 20000)
 */
export async function gotoAndWaitForMermaid(
	page: Page,
	url: string,
	expectedDiagramCount?: number,
	timeout: number = 20000
): Promise<void> {
	// Navigate to page and wait for network to be idle
	await page.goto(url, {
		waitUntil: 'networkidle2',
		timeout: timeout / 2 // Use half timeout for navigation
	});

	// Wait for Mermaid diagrams to render
	await waitForMermaidDiagrams(page, expectedDiagramCount, timeout / 2);
}
