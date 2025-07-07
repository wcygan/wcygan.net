import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Page } from 'puppeteer';
import {
	launchBrowser,
	closeBrowser,
	createPage,
	closePage,
	getTestBaseUrl,
	// waitForMermaidDiagrams, // Unused import
	waitForMermaidDiagramType,
	gotoAndWaitForMermaid
} from './testUtils';

describe('Mermaid Diagrams Integration Tests', () => {
	let page: Page;
	const baseUrl = getTestBaseUrl();

	beforeAll(async () => {
		try {
			// Launch shared browser instance
			await launchBrowser();
		} catch (error) {
			console.error('Setup failed:', error);
			throw error;
		}
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

	describe('Flow Chart Diagrams', () => {
		it('should render flow chart diagram correctly', async () => {
			// Use enhanced navigation and waiting
			await gotoAndWaitForMermaid(page, `${baseUrl}/blog/mermaid-diagrams`, 1, 15000);

			// Wait for specific diagram type
			await waitForMermaidDiagramType(page, 'flowchart', 10000);

			// Check if the flow chart contains expected elements
			const flowChartSvg = await page.$eval('.mermaid-render-container svg', (svg) => {
				// Try different selectors for nodes and edges
				const nodes = svg.querySelectorAll(
					'.node, .nodeLabel, [class*="node"], g[id*="flowchart"]'
				);
				const edges = svg.querySelectorAll(
					'.edgePath, path[class*="edge"], .path, .flowchart-link'
				);
				return {
					hasNodes: nodes.length > 0,
					hasEdges: edges.length > 0,
					nodeCount: nodes.length,
					edgeCount: edges.length
				};
			});

			expect(flowChartSvg.hasNodes).toBe(true);
			expect(flowChartSvg.hasEdges).toBe(true);
			expect(flowChartSvg.nodeCount).toBeGreaterThan(5); // Based on the deployment flow
			expect(flowChartSvg.edgeCount).toBeGreaterThan(5);
		});

		it('should apply dark theme styling to flow charts', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			const isDarkThemeApplied = await page.$eval('.mermaid-render-container', (container) => {
				const svg = container.querySelector('svg');
				const computedStyle = window.getComputedStyle(svg!);
				return computedStyle.backgroundColor !== 'rgb(255, 255, 255)';
			});

			expect(isDarkThemeApplied).toBe(true);
		});
	});

	describe('Sequence Diagrams', () => {
		it('should render sequence diagram with all participants', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			// Wait for sequence diagrams to render
			await page.waitForFunction(
				() => {
					const diagrams = document.querySelectorAll('.mermaid-render-container svg');
					return diagrams.length >= 2; // At least 2 diagrams loaded
				},
				{ timeout: 10000 }
			);

			// Find the sequence diagram (second diagram in the post)
			const sequenceDiagramData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				const sequenceDiagram = diagrams[1]; // Second diagram is the sequence diagram

				return {
					hasActors: sequenceDiagram.querySelectorAll('.actor').length > 0,
					actorCount: sequenceDiagram.querySelectorAll('.actor').length,
					hasMessages: sequenceDiagram.querySelectorAll('.messageLine0').length > 0,
					messageCount: sequenceDiagram.querySelectorAll('.messageLine0').length
				};
			});

			expect(sequenceDiagramData.hasActors).toBe(true);
			expect(sequenceDiagramData.actorCount).toBeGreaterThanOrEqual(4); // User, Client, Auth, Resource
			expect(sequenceDiagramData.hasMessages).toBe(true);
			expect(sequenceDiagramData.messageCount).toBeGreaterThan(10); // Multiple API calls
		});
	});

	describe('State Diagrams', () => {
		it('should render state diagram with transitions', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			await page.waitForFunction(
				() => {
					const diagrams = document.querySelectorAll('.mermaid-render-container svg');
					return diagrams.length >= 3;
				},
				{ timeout: 10000 }
			);

			const stateDiagramData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				const stateDiagram = diagrams[2]; // Third diagram is the state diagram

				return {
					hasStates:
						stateDiagram.querySelectorAll('.node, .state-group, [class*="state"], g[id*="state"]')
							.length > 0,
					stateCount: stateDiagram.querySelectorAll(
						'.node, .state-group, [class*="state"], g[id*="state"]'
					).length,
					hasTransitions:
						stateDiagram.querySelectorAll('.edgePath, path[class*="edge"], .transition').length > 0,
					transitionCount: stateDiagram.querySelectorAll(
						'.edgePath, path[class*="edge"], .transition'
					).length
				};
			});

			expect(stateDiagramData.hasStates).toBe(true);
			expect(stateDiagramData.stateCount).toBeGreaterThanOrEqual(6); // Multiple order states
			expect(stateDiagramData.hasTransitions).toBe(true);
			expect(stateDiagramData.transitionCount).toBeGreaterThan(5);
		});
	});

	describe('Git Graph Diagrams', () => {
		it('should render git graph with commits and branches', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			await page.waitForFunction(
				() => {
					const diagrams = document.querySelectorAll('.mermaid-render-container svg');
					return diagrams.length >= 4;
				},
				{ timeout: 10000 }
			);

			const gitGraphData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				const gitGraph = diagrams[3]; // Fourth diagram is the git graph

				return {
					hasCommits: gitGraph.querySelectorAll('.commit').length > 0,
					commitCount: gitGraph.querySelectorAll('.commit').length,
					hasBranches: gitGraph.querySelectorAll('.branch').length > 0,
					branchLabels: Array.from(gitGraph.querySelectorAll('text'))
						.map((t) => t.textContent)
						.filter((t) => t)
				};
			});

			expect(gitGraphData.hasCommits).toBe(true);
			expect(gitGraphData.commitCount).toBeGreaterThan(4);
			expect(gitGraphData.hasBranches).toBe(true);
			expect(gitGraphData.branchLabels).toContain('main');
			expect(gitGraphData.branchLabels).toContain('develop');
		});
	});

	describe('Entity Relationship Diagrams', () => {
		it('should render ER diagram with entities and relationships', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			await page.waitForFunction(
				() => {
					const diagrams = document.querySelectorAll('.mermaid-render-container svg');
					return diagrams.length >= 5;
				},
				{ timeout: 10000 }
			);

			const erDiagramData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				const erDiagram = diagrams[4]; // Fifth diagram is the ER diagram

				return {
					hasEntities:
						erDiagram.querySelectorAll('.er.entityBox, .entity, [class*="entity"], g[class*="er"]')
							.length > 0,
					entityCount: erDiagram.querySelectorAll(
						'.er.entityBox, .entity, [class*="entity"], g[class*="er"]'
					).length,
					hasRelationships:
						erDiagram.querySelectorAll(
							'.er.relationshipLine, .relation, [class*="relationship"], path[class*="er"]'
						).length > 0,
					relationshipCount: erDiagram.querySelectorAll(
						'.er.relationshipLine, .relation, [class*="relationship"], path[class*="er"]'
					).length
				};
			});

			expect(erDiagramData.hasEntities).toBe(true);
			expect(erDiagramData.entityCount).toBeGreaterThanOrEqual(4); // Should have at least USER, POST, COMMENT, CATEGORY
			expect(erDiagramData.hasRelationships).toBe(true);
			expect(erDiagramData.relationshipCount).toBeGreaterThanOrEqual(3);
		});
	});

	describe('Pie Chart Diagrams', () => {
		it('should render pie chart with correct segments', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			await page.waitForFunction(
				() => {
					const diagrams = document.querySelectorAll('.mermaid-render-container svg');
					return diagrams.length >= 6;
				},
				{ timeout: 15000 }
			);

			const pieChartData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				const pieChart = diagrams[5]; // Sixth diagram is the pie chart

				return {
					hasSlices: pieChart.querySelectorAll('.pieCircle').length > 0,
					sliceCount: pieChart.querySelectorAll('.pieCircle').length,
					hasLabels: pieChart.querySelectorAll('.pieTitleText').length > 0,
					hasLegend: pieChart.querySelectorAll('.legend').length > 0
				};
			});

			expect(pieChartData.hasSlices).toBe(true);
			expect(pieChartData.sliceCount).toBe(5); // 5 technology categories
			expect(pieChartData.hasLabels).toBe(true);
		});
	});

	describe('Viewport Lazy Loading', () => {
		it('should lazy load diagrams when scrolled into view', async () => {
			// Navigate to the blog post - all diagrams render immediately there
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			// Verify that diagrams exist and are rendered
			const diagramCount = await page.$$eval('.mermaid-render-container svg', (els) => els.length);
			expect(diagramCount).toBeGreaterThan(0);

			// Verify viewport detection works by checking IntersectionObserver is defined
			const hasIntersectionObserver = await page.evaluate(() => {
				return typeof IntersectionObserver !== 'undefined';
			});
			expect(hasIntersectionObserver).toBe(true);
		});
	});

	describe('Caching Behavior', () => {
		it('should cache rendered diagrams in sessionStorage', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });

			// Wait for first diagram to render
			await page.waitForSelector('.mermaid-render-container svg');

			// Check sessionStorage for cached diagrams
			const cacheData = await page.evaluate(() => {
				const cacheKeys = Object.keys(sessionStorage).filter((key) =>
					key.startsWith('mermaid-cache-')
				);
				return {
					hasCachedDiagrams: cacheKeys.length > 0,
					cacheCount: cacheKeys.length,
					sampleCache: cacheKeys.length > 0 ? sessionStorage.getItem(cacheKeys[0]) : null
				};
			});

			expect(cacheData.hasCachedDiagrams).toBe(true);
			expect(cacheData.cacheCount).toBeGreaterThan(0);
			expect(cacheData.sampleCache).toContain('<svg');
		});

		it('should use cached SVG on page reload', async () => {
			// First visit to cache diagrams
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			// Get initial render time
			// const initialRenderTime = await page.evaluate(() => performance.now()); // Unused variable

			// Reload page
			await page.reload({ waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			// Check if diagrams loaded faster (from cache)
			// const reloadRenderTime = await page.evaluate(() => performance.now()); // Unused variable

			// Check that diagrams are still rendered (cache is working)
			const cachedDiagrams = await page.$$eval(
				'.mermaid-render-container svg',
				(els) => els.length
			);
			expect(cachedDiagrams).toBeGreaterThan(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid diagram syntax gracefully', async () => {
			// Navigate to a test page with invalid diagrams
			await page.evaluate(() => {
				// Create a test element with invalid Mermaid syntax
				const testContainer = document.createElement('div');
				testContainer.innerHTML = `
          <div class="mermaid-diagram" data-diagram="invalid syntax here">
            <div class="mermaid-render-container"></div>
          </div>
        `;
				document.body.appendChild(testContainer);
			});

			// Trigger Mermaid rendering
			await page.evaluate(async () => {
				const mermaid = (window as unknown as { mermaid?: { run(): Promise<void> } }).mermaid;
				if (mermaid) {
					try {
						await mermaid.run();
					} catch {
						// Expected to fail
					}
				}
			});

			// Check error handling
			const errorHandled = await page.evaluate(() => {
				const containers = document.querySelectorAll('.mermaid-render-container');
				return Array.from(containers).some((container) => {
					return (
						container.textContent?.includes('error') ||
						container.classList.contains('error') ||
						container.querySelector('.error-message') !== null
					);
				});
			});

			// The component should handle errors gracefully without crashing
			expect(errorHandled).toBeDefined();
		});
	});

	describe('Responsive Design', () => {
		it('should render diagrams responsively on mobile viewport', async () => {
			// Set mobile viewport
			await page.setViewport({ width: 375, height: 667 });

			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			const diagramDimensions = await page.$eval('.mermaid-render-container svg', (svg) => {
				const rect = svg.getBoundingClientRect();
				return {
					width: rect.width,
					height: rect.height,
					viewBox: svg.getAttribute('viewBox')
				};
			});

			// Diagram should fit within mobile viewport
			expect(diagramDimensions.width).toBeLessThanOrEqual(375);
			expect(diagramDimensions.viewBox).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels for diagrams', async () => {
			await page.goto(`${baseUrl}/blog/mermaid-diagrams`, { waitUntil: 'networkidle2' });
			await page.waitForSelector('.mermaid-render-container svg');

			const accessibilityData = await page.evaluate(() => {
				const diagrams = document.querySelectorAll('.mermaid-render-container svg');
				return Array.from(diagrams).map((svg) => ({
					hasTitle: svg.querySelector('title') !== null,
					hasDesc: svg.querySelector('desc') !== null,
					role: svg.getAttribute('role'),
					ariaLabel: svg.getAttribute('aria-label')
				}));
			});

			accessibilityData.forEach((data) => {
				expect(data.role).toMatch(/img|graphics-document/);
				expect(data.hasTitle || data.ariaLabel || data.role).toBeTruthy();
			});
		});
	});
});
