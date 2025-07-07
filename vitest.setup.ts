import { vi } from 'vitest';

// Setup global mocks
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
};
