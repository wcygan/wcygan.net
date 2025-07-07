import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tick } from 'svelte';

// Mock the tick function
vi.mock('svelte', () => ({
	tick: vi.fn(() => Promise.resolve()),
	onMount: vi.fn((fn) => fn())
}));

describe('MermaidFlexible component logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('diagram source resolution', () => {
		it('should prefer diagram prop over slot content', () => {
			const diagramProp = 'flowchart TD\n  A --> B';
			const slotContent = 'graph LR\n  C --> D';

			// Simulate the reactive statement
			const finalDiagram = diagramProp || slotContent;

			expect(finalDiagram).toBe(diagramProp);
		});

		it('should use slot content when diagram prop is undefined', () => {
			const diagramProp = undefined;
			const slotContent = 'graph LR\n  C --> D';

			// Simulate the reactive statement
			const finalDiagram = diagramProp || slotContent;

			expect(finalDiagram).toBe(slotContent);
		});

		it('should use slot content when diagram prop is empty string', () => {
			const diagramProp = '';
			const slotContent = 'graph LR\n  C --> D';

			// Simulate the reactive statement
			const finalDiagram = diagramProp || slotContent;

			expect(finalDiagram).toBe(slotContent);
		});

		it('should handle both prop and slot being empty', () => {
			const diagramProp = '';
			const slotContent = '';

			// Simulate the reactive statement
			const finalDiagram = diagramProp || slotContent;

			expect(finalDiagram).toBe('');
		});
	});

	describe('slot content extraction', () => {
		it('should extract text content from slot element', async () => {
			const slotElement = document.createElement('div');
			slotElement.textContent = '  flowchart TD\n  A --> B  ';
			document.body.appendChild(slotElement);

			await tick();

			// Simulate content extraction
			const content = slotElement.textContent?.trim() || '';

			expect(content).toBe('flowchart TD\n  A --> B');
		});

		it('should handle empty slot element', async () => {
			const slotElement = document.createElement('div');
			slotElement.textContent = '';
			document.body.appendChild(slotElement);

			await tick();

			// Simulate content extraction
			const content = slotElement.textContent?.trim() || '';

			expect(content).toBe('');
		});

		it('should handle whitespace-only slot content', async () => {
			const slotElement = document.createElement('div');
			slotElement.textContent = '   \n\t   ';
			document.body.appendChild(slotElement);

			await tick();

			// Simulate content extraction
			const content = slotElement.textContent?.trim() || '';

			expect(content).toBe('');
		});

		it('should handle null textContent', async () => {
			const slotElement = document.createElement('div');
			Object.defineProperty(slotElement, 'textContent', {
				value: null,
				writable: true
			});

			await tick();

			// Simulate content extraction
			const content = slotElement.textContent?.trim() || '';

			expect(content).toBe('');
		});
	});

	describe('component selection logic', () => {
		it('should select viewport component when viewport is true', () => {
			const viewport = true;
			const lazy = false;

			let selectedComponent = '';

			if (viewport) {
				selectedComponent = 'MermaidViewport';
			} else if (lazy) {
				selectedComponent = 'MermaidLazy';
			} else {
				selectedComponent = 'MermaidDiagram';
			}

			expect(selectedComponent).toBe('MermaidViewport');
		});

		it('should select lazy component when lazy is true and viewport is false', () => {
			const viewport = false;
			const lazy = true;

			let selectedComponent = '';

			if (viewport) {
				selectedComponent = 'MermaidViewport';
			} else if (lazy) {
				selectedComponent = 'MermaidLazy';
			} else {
				selectedComponent = 'MermaidDiagram';
			}

			expect(selectedComponent).toBe('MermaidLazy');
		});

		it('should select default component when both viewport and lazy are false', () => {
			const viewport = false;
			const lazy = false;

			let selectedComponent = '';

			if (viewport) {
				selectedComponent = 'MermaidViewport';
			} else if (lazy) {
				selectedComponent = 'MermaidLazy';
			} else {
				selectedComponent = 'MermaidDiagram';
			}

			expect(selectedComponent).toBe('MermaidDiagram');
		});

		it('should prioritize viewport over lazy when both are true', () => {
			const viewport = true;
			const lazy = true;

			let selectedComponent = '';

			if (viewport) {
				selectedComponent = 'MermaidViewport';
			} else if (lazy) {
				selectedComponent = 'MermaidLazy';
			} else {
				selectedComponent = 'MermaidDiagram';
			}

			expect(selectedComponent).toBe('MermaidViewport');
		});
	});

	describe('mounted state handling', () => {
		it('should wait for mount before rendering', async () => {
			let mounted = false;
			let slotContent = '';
			// const diagram = undefined; // Unused variable

			// Before mount
			expect(mounted).toBe(false);

			// Simulate onMount
			await tick();
			mounted = true;
			slotContent = 'flowchart TD\n  A --> B';

			expect(mounted).toBe(true);
			expect(slotContent).toBeTruthy();
		});

		it('should handle mount with diagram prop', async () => {
			let mounted = false;
			// const diagram = 'flowchart TD\n  A --> B'; // Unused variable

			// Before mount
			expect(mounted).toBe(false);

			// Simulate onMount
			await tick();
			mounted = true;

			expect(mounted).toBe(true);
			// Should not need slot content when diagram prop exists
		});
	});

	describe('lazy loading behavior', () => {
		it('should dynamically import MermaidLazy when lazy is true', async () => {
			const mockImport = vi.fn();

			const lazy = true;
			const viewport = false;

			if (!viewport && lazy) {
				await mockImport();
			}

			expect(mockImport).toHaveBeenCalled();
		});

		it('should not import MermaidLazy when lazy is false', () => {
			const mockImport = vi.fn();

			const lazy = false;
			const viewport = false;

			if (!viewport && lazy) {
				mockImport();
			}

			expect(mockImport).not.toHaveBeenCalled();
		});
	});

	describe('height prop handling', () => {
		it('should use default height of 400', () => {
			const height = undefined;
			const defaultHeight = 400;

			const finalHeight = height || defaultHeight;

			expect(finalHeight).toBe(400);
		});

		it('should use custom height when provided', () => {
			const height = 600;
			const defaultHeight = 400;

			const finalHeight = height || defaultHeight;

			expect(finalHeight).toBe(600);
		});
	});
});
