// import { render } from '@testing-library/svelte'; // Unused import
import { vi } from 'vitest';

// Mock IntersectionObserver for viewport tests
export const mockIntersectionObserver = () => {
	const mockObserve = vi.fn();
	const mockUnobserve = vi.fn();
	const mockDisconnect = vi.fn();

	let observerCallback: IntersectionObserverCallback | null = null;

	const mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
		observerCallback = callback;
		return {
			observe: mockObserve,
			unobserve: mockUnobserve,
			disconnect: mockDisconnect
		};
	});

	window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

	return {
		IntersectionObserver: mockIntersectionObserver,
		observe: mockObserve,
		unobserve: mockUnobserve,
		disconnect: mockDisconnect,
		trigger: (entries: Partial<IntersectionObserverEntry>[]) => {
			if (observerCallback) {
				observerCallback(entries as IntersectionObserverEntry[], {} as IntersectionObserver);
			}
		}
	};
};

// Mock sessionStorage for cache tests
export const mockSessionStorage = () => {
	let store: Record<string, string> = {};

	const sessionStorageMock = {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		key: vi.fn((index: number) => {
			const keys = Object.keys(store);
			return keys[index] || null;
		}),
		get length() {
			return Object.keys(store).length;
		}
	};

	Object.defineProperty(window, 'sessionStorage', {
		value: sessionStorageMock,
		writable: true
	});

	return sessionStorageMock;
};

// Helper to wait for async updates
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Mermaid module
export const createMockMermaid = () => {
	return {
		default: {
			initialize: vi.fn(),
			render: vi.fn().mockResolvedValue({
				svg: '<svg><text>Mock Diagram</text></svg>'
			}),
			version: '10.0.0'
		}
	};
};
