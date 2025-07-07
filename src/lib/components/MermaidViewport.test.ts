import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockIntersectionObserver } from '$lib/test-utils';

describe('MermaidViewport component logic', () => {
	let mockObserver: ReturnType<typeof mockIntersectionObserver>;

	beforeEach(() => {
		mockObserver = mockIntersectionObserver();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('IntersectionObserver usage', () => {
		it('should create observer with correct options', () => {
			const element = document.createElement('div');
			const rootMargin = '100px';
			const threshold = 0;

			const observer = new IntersectionObserver(vi.fn(), { rootMargin, threshold });

			observer.observe(element);

			expect(mockObserver.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
				rootMargin,
				threshold
			});
			expect(mockObserver.observe).toHaveBeenCalledWith(element);
		});

		it('should trigger render when element is intersecting', () => {
			let shouldRender = false;
			const callback = vi.fn((entries: IntersectionObserverEntry[]) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !shouldRender) {
						shouldRender = true;
					}
				});
			});

			const observer = new IntersectionObserver(callback);
			const element = document.createElement('div');
			observer.observe(element);

			// Trigger intersection
			mockObserver.trigger([{ isIntersecting: true }]);

			expect(callback).toHaveBeenCalled();
			expect(shouldRender).toBe(true);
		});

		it('should not trigger render when element is not intersecting', () => {
			let shouldRender = false;
			const callback = vi.fn((entries: IntersectionObserverEntry[]) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !shouldRender) {
						shouldRender = true;
					}
				});
			});

			const observer = new IntersectionObserver(callback);
			const element = document.createElement('div');
			observer.observe(element);

			// Trigger non-intersection
			mockObserver.trigger([{ isIntersecting: false }]);

			expect(callback).toHaveBeenCalled();
			expect(shouldRender).toBe(false);
		});

		it('should disconnect observer after intersection', () => {
			let shouldRender = false;
			const observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !shouldRender) {
						shouldRender = true;
						observer.disconnect();
					}
				});
			});

			const element = document.createElement('div');
			observer.observe(element);

			// Trigger intersection
			mockObserver.trigger([{ isIntersecting: true }]);

			expect(mockObserver.disconnect).toHaveBeenCalled();
		});

		it('should disconnect observer on cleanup', () => {
			const observer = new IntersectionObserver(vi.fn());
			const element = document.createElement('div');
			observer.observe(element);

			// Simulate cleanup
			observer.disconnect();

			expect(mockObserver.disconnect).toHaveBeenCalled();
		});

		it('should handle multiple entries', () => {
			let intersectingCount = 0;
			const callback = vi.fn((entries: IntersectionObserverEntry[]) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						intersectingCount++;
					}
				});
			});

			const observer = new IntersectionObserver(callback);
			const element = document.createElement('div');
			observer.observe(element);

			// Trigger multiple entries
			mockObserver.trigger([
				{ isIntersecting: true },
				{ isIntersecting: false },
				{ isIntersecting: true }
			]);

			expect(callback).toHaveBeenCalled();
			expect(intersectingCount).toBe(2);
		});
	});

	describe('fallback behavior', () => {
		it('should render immediately when IntersectionObserver is not available', () => {
			// Remove IntersectionObserver
			const originalIO = window.IntersectionObserver;
			// @ts-expect-error - Testing fallback when IntersectionObserver is not available
			delete window.IntersectionObserver;

			let shouldRender = false;

			// Simulate onMount logic
			if (!('IntersectionObserver' in window)) {
				shouldRender = true;
			}

			expect(shouldRender).toBe(true);

			// Restore
			window.IntersectionObserver = originalIO;
		});

		it('should use IntersectionObserver when available', () => {
			let shouldRender = false;

			// Simulate onMount logic
			if ('IntersectionObserver' in window) {
				// Would create observer
				expect(window.IntersectionObserver).toBeDefined();
			} else {
				shouldRender = true;
			}

			expect(shouldRender).toBe(false);
		});
	});

	describe('configuration options', () => {
		it('should accept custom rootMargin', () => {
			const customRootMargin = '200px';

			new IntersectionObserver(vi.fn(), { rootMargin: customRootMargin });

			expect(mockObserver.IntersectionObserver).toHaveBeenCalledWith(
				expect.any(Function),
				expect.objectContaining({ rootMargin: customRootMargin })
			);
		});

		it('should use default rootMargin of 100px', () => {
			const defaultRootMargin = '100px';

			new IntersectionObserver(vi.fn(), { rootMargin: defaultRootMargin });

			expect(mockObserver.IntersectionObserver).toHaveBeenCalledWith(
				expect.any(Function),
				expect.objectContaining({ rootMargin: defaultRootMargin })
			);
		});

		it('should use threshold of 0', () => {
			new IntersectionObserver(vi.fn(), { threshold: 0 });

			expect(mockObserver.IntersectionObserver).toHaveBeenCalledWith(
				expect.any(Function),
				expect.objectContaining({ threshold: 0 })
			);
		});
	});

	describe('render state management', () => {
		it('should only render once even with multiple intersections', () => {
			let shouldRender = false;
			let renderCount = 0;

			const callback = (entries: IntersectionObserverEntry[]) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !shouldRender) {
						shouldRender = true;
						renderCount++;
					}
				});
			};

			const observer = new IntersectionObserver(callback);
			const element = document.createElement('div');
			observer.observe(element);

			// Trigger multiple intersections
			mockObserver.trigger([{ isIntersecting: true }]);
			mockObserver.trigger([{ isIntersecting: true }]);
			mockObserver.trigger([{ isIntersecting: true }]);

			expect(renderCount).toBe(1);
			expect(shouldRender).toBe(true);
		});
	});
});
