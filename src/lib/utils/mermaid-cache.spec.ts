import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCachedSVG, setCachedSVG, clearAllCache } from './mermaid-cache';
import { mockSessionStorage } from '$lib/test-utils';

describe('mermaid-cache', () => {
	let sessionStorageMock: ReturnType<typeof mockSessionStorage>;

	beforeEach(() => {
		sessionStorageMock = mockSessionStorage();
		vi.clearAllMocks();
	});

	describe('getCachedSVG', () => {
		it('should return null when no cache exists', () => {
			const result = getCachedSVG('test diagram');
			expect(result).toBeNull();
		});

		it('should return cached SVG when it exists and is not expired', () => {
			const diagram = 'flowchart TD\n  A --> B';
			const svg = '<svg>test</svg>';
			const cacheEntry = {
				svg,
				timestamp: Date.now()
			};

			sessionStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

			const result = getCachedSVG(diagram);
			expect(result).toBe(svg);
			expect(sessionStorageMock.getItem).toHaveBeenCalled();
		});

		it('should return null and remove expired cache', () => {
			const diagram = 'flowchart TD\n  A --> B';
			const svg = '<svg>test</svg>';
			const cacheEntry = {
				svg,
				timestamp: Date.now() - 3700000 // Over 1 hour ago
			};

			sessionStorageMock.getItem.mockReturnValue(JSON.stringify(cacheEntry));

			const result = getCachedSVG(diagram);
			expect(result).toBeNull();
			expect(sessionStorageMock.removeItem).toHaveBeenCalled();
		});

		it('should handle invalid JSON gracefully', () => {
			sessionStorageMock.getItem.mockReturnValue('invalid json');

			const result = getCachedSVG('test diagram');
			expect(result).toBeNull();
		});

		it('should return null when window is undefined (SSR)', () => {
			const originalWindow = global.window;
			// @ts-expect-error - Testing SSR environment without window
			delete global.window;

			const result = getCachedSVG('test diagram');
			expect(result).toBeNull();

			global.window = originalWindow;
		});
	});

	describe('setCachedSVG', () => {
		it('should store SVG in cache', () => {
			const diagram = 'flowchart TD\n  A --> B';
			const svg = '<svg>test</svg>';

			setCachedSVG(diagram, svg);

			expect(sessionStorageMock.setItem).toHaveBeenCalled();
			const [[key, value]] = sessionStorageMock.setItem.mock.calls;
			expect(key).toContain('mermaid-cache-');

			const stored = JSON.parse(value);
			expect(stored.svg).toBe(svg);
			expect(stored.timestamp).toBeCloseTo(Date.now(), -2);
		});

		it('should handle storage quota errors', () => {
			const diagram = 'flowchart TD\n  A --> B';
			const svg = '<svg>test</svg>';

			sessionStorageMock.setItem.mockImplementation(() => {
				throw new Error('QuotaExceededError');
			});

			// Should not throw
			expect(() => setCachedSVG(diagram, svg)).not.toThrow();
		});

		it('should not store when window is undefined (SSR)', () => {
			const originalWindow = global.window;
			// @ts-expect-error - Testing SSR environment without window
			delete global.window;

			setCachedSVG('test', '<svg></svg>');
			expect(sessionStorageMock.setItem).not.toHaveBeenCalled();

			global.window = originalWindow;
		});
	});

	describe('clearAllCache', () => {
		it('should remove all mermaid cache entries', () => {
			// Mock sessionStorage with multiple entries
			const mockLength = 3;
			const mockKeys = ['mermaid-cache-123', 'other-key', 'mermaid-cache-456'];

			Object.defineProperty(sessionStorageMock, 'length', {
				get: () => mockLength
			});

			sessionStorageMock.key.mockImplementation((index: number) => mockKeys[index] || null);

			clearAllCache();

			expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('mermaid-cache-123');
			expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('mermaid-cache-456');
			expect(sessionStorageMock.removeItem).not.toHaveBeenCalledWith('other-key');
		});

		it('should handle empty cache', () => {
			Object.defineProperty(sessionStorageMock, 'length', {
				get: () => 0
			});

			clearAllCache();
			expect(sessionStorageMock.removeItem).not.toHaveBeenCalled();
		});
	});

	describe('hash function', () => {
		it('should generate consistent hashes for same input', () => {
			const diagram = 'flowchart TD\n  A --> B';

			// Since we can't directly test the private hash function,
			// we verify it works by checking cache keys are consistent
			setCachedSVG(diagram, '<svg>1</svg>');
			setCachedSVG(diagram, '<svg>2</svg>');

			// Should have called setItem twice with the same key
			const calls = sessionStorageMock.setItem.mock.calls;
			expect(calls[0][0]).toBe(calls[1][0]);
		});

		it('should generate different hashes for different inputs', () => {
			setCachedSVG('diagram1', '<svg>1</svg>');
			setCachedSVG('diagram2', '<svg>2</svg>');

			const calls = sessionStorageMock.setItem.mock.calls;
			expect(calls[0][0]).not.toBe(calls[1][0]);
		});
	});
});
