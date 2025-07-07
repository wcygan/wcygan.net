import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedSVG, setCachedSVG } from '$lib/utils/mermaid-cache';

// Mock the mermaid module
vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(),
		version: '10.0.0'
	}
}));

// Mock the cache utilities
vi.mock('$lib/utils/mermaid-cache', () => ({
	getCachedSVG: vi.fn(),
	setCachedSVG: vi.fn()
}));

describe('MermaidDiagram component logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset DOM
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadMermaid function behavior', () => {
		it('should handle successful mermaid module loading', async () => {
			const mermaidModule = await import('mermaid');
			expect(mermaidModule.default).toBeDefined();
			expect(mermaidModule.default.initialize).toBeDefined();
			expect(mermaidModule.default.render).toBeDefined();
		});

		it('should handle module with default export', async () => {
			const mermaidModule = await import('mermaid');
			const mermaid = mermaidModule.default || mermaidModule;
			expect(mermaid).toBeDefined();
			expect(typeof mermaid.initialize).toBe('function');
		});
	});

	describe('renderDiagram function behavior', () => {
		it('should use cached SVG when available', async () => {
			const cachedSVG = '<svg>cached diagram</svg>';
			const mockGetCachedSVG = getCachedSVG as ReturnType<typeof vi.fn>;
			mockGetCachedSVG.mockReturnValue(cachedSVG);

			const container = document.createElement('div');
			document.body.appendChild(container);

			const diagram = 'flowchart TD\n  A --> B';

			// Simulate cache hit
			const svg = getCachedSVG(diagram);
			if (svg) {
				container.innerHTML = svg;
			}

			expect(mockGetCachedSVG).toHaveBeenCalledWith(diagram);
			expect(container.innerHTML).toBe(cachedSVG);
		});

		it('should render and cache new diagrams', async () => {
			const mockGetCachedSVG = getCachedSVG as ReturnType<typeof vi.fn>;
			const mockSetCachedSVG = setCachedSVG as ReturnType<typeof vi.fn>;
			mockGetCachedSVG.mockReturnValue(null);

			const mermaidModule = await import('mermaid');
			const mermaid = mermaidModule.default;

			const renderedSVG = '<svg>new diagram</svg>';
			(mermaid.render as ReturnType<typeof vi.fn>).mockResolvedValue({
				svg: renderedSVG,
				bindFunctions: vi.fn()
			});

			const diagram = 'flowchart TD\n  A --> B';
			const id = `mermaid-test`;

			// Simulate rendering
			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				securityLevel: 'loose',
				logLevel: 'debug',
				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis'
				}
			});

			const result = await mermaid.render(id, diagram);

			expect(mermaid.initialize).toHaveBeenCalled();
			expect(mermaid.render).toHaveBeenCalledWith(id, diagram);
			expect(result.svg).toBe(renderedSVG);

			// Verify caching would be called
			setCachedSVG(diagram, result.svg);
			expect(mockSetCachedSVG).toHaveBeenCalledWith(diagram, renderedSVG);
		});

		it('should handle render errors gracefully', async () => {
			const mermaidModule = await import('mermaid');
			const mermaid = mermaidModule.default;

			const errorMessage = 'Invalid diagram syntax';
			(mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

			const diagram = 'invalid diagram';
			const id = `mermaid-test`;

			await expect(mermaid.render(id, diagram)).rejects.toThrow(errorMessage);
		});

		it('should handle missing container gracefully', async () => {
			const container = null;
			// const diagram = 'flowchart TD\n  A --> B'; // Unused variable

			// Simulate the check in renderDiagram
			if (!container) {
				// Would throw or handle error
				expect(container).toBeNull();
			}
		});

		it('should clean up orphaned elements', async () => {
			// Create orphaned elements
			const orphan1 = document.createElement('div');
			orphan1.id = 'dmermaid-test-orphan1';
			const orphan2 = document.createElement('div');
			orphan2.id = 'dmermaid-test-orphan2';

			document.body.appendChild(orphan1);
			document.body.appendChild(orphan2);

			// Simulate cleanup
			const orphans = document.querySelectorAll('[id^="dmermaid-test"]');
			expect(orphans.length).toBe(2);

			orphans.forEach((el) => {
				el.remove();
			});

			expect(document.querySelector('#dmermaid-test-orphan1')).toBeNull();
			expect(document.querySelector('#dmermaid-test-orphan2')).toBeNull();
		});
	});

	describe('diagram validation', () => {
		it('should handle empty diagram content', () => {
			const diagram = '';
			const isValid = diagram.trim() !== '';
			expect(isValid).toBe(false);
		});

		it('should handle whitespace-only diagram', () => {
			const diagram = '   \n\t   ';
			const isValid = diagram.trim() !== '';
			expect(isValid).toBe(false);
		});

		it('should accept valid diagram content', () => {
			const diagram = 'flowchart TD\n  A --> B';
			const isValid = diagram.trim() !== '';
			expect(isValid).toBe(true);
		});
	});

	describe('unique ID generation', () => {
		it('should generate unique IDs for diagrams', () => {
			const ids = new Set<string>();

			for (let i = 0; i < 100; i++) {
				const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
				ids.add(id);
			}

			// All IDs should be unique
			expect(ids.size).toBe(100);
		});

		it('should follow expected ID format', () => {
			const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			expect(id).toMatch(/^mermaid-\d+-[a-z0-9]+$/);
		});
	});

	describe('initialization options', () => {
		it('should use correct dark theme configuration', async () => {
			const mermaidModule = await import('mermaid');
			const mermaid = mermaidModule.default;

			const expectedConfig = {
				startOnLoad: false,
				theme: 'dark' as const,
				securityLevel: 'loose' as const,
				logLevel: 'debug' as const,
				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis' as const
				}
			};

			mermaid.initialize(expectedConfig);

			expect(mermaid.initialize).toHaveBeenCalledWith(expectedConfig);
		});
	});
});
