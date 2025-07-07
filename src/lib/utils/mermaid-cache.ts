/**
 * Simple cache for rendered Mermaid SVGs
 * Uses sessionStorage to persist during the session
 */

interface CacheEntry {
	svg: string;
	timestamp: number;
}

const CACHE_PREFIX = 'mermaid-cache-';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Generate a hash for the diagram content
 */
function hashDiagram(diagram: string): string {
	let hash = 0;
	for (let i = 0; i < diagram.length; i++) {
		const char = diagram.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Get cached SVG if available and not expired
 */
export function getCachedSVG(diagram: string): string | null {
	if (typeof window === 'undefined' || !window.sessionStorage) {
		return null;
	}

	const key = CACHE_PREFIX + hashDiagram(diagram);

	try {
		const cached = sessionStorage.getItem(key);
		if (!cached) return null;

		const entry: CacheEntry = JSON.parse(cached);
		const now = Date.now();

		// Check if cache is still valid
		if (now - entry.timestamp > CACHE_DURATION) {
			sessionStorage.removeItem(key);
			return null;
		}

		console.log('[MermaidCache] Cache hit for diagram');
		return entry.svg;
	} catch (e) {
		console.warn('[MermaidCache] Error reading cache:', e);
		return null;
	}
}

/**
 * Store rendered SVG in cache
 */
export function setCachedSVG(diagram: string, svg: string): void {
	if (typeof window === 'undefined' || !window.sessionStorage) {
		return;
	}

	const key = CACHE_PREFIX + hashDiagram(diagram);
	const entry: CacheEntry = {
		svg,
		timestamp: Date.now()
	};

	try {
		sessionStorage.setItem(key, JSON.stringify(entry));
		console.log('[MermaidCache] Cached diagram');
	} catch (e) {
		// Likely quota exceeded, clear old entries
		console.warn('[MermaidCache] Error caching, clearing old entries:', e);
		clearOldCacheEntries();
	}
}

/**
 * Clear old cache entries
 */
function clearOldCacheEntries(): void {
	if (typeof window === 'undefined' || !window.sessionStorage) {
		return;
	}

	const now = Date.now();
	const keysToRemove: string[] = [];

	// Find expired entries
	for (let i = 0; i < sessionStorage.length; i++) {
		const key = sessionStorage.key(i);
		if (key && key.startsWith(CACHE_PREFIX)) {
			try {
				const cached = sessionStorage.getItem(key);
				if (cached) {
					const entry: CacheEntry = JSON.parse(cached);
					if (now - entry.timestamp > CACHE_DURATION) {
						keysToRemove.push(key);
					}
				}
			} catch {
				// Invalid entry, remove it
				keysToRemove.push(key);
			}
		}
	}

	// Remove expired entries
	keysToRemove.forEach((key) => sessionStorage.removeItem(key));
	console.log(`[MermaidCache] Cleared ${keysToRemove.length} expired entries`);
}

/**
 * Clear all Mermaid cache entries
 */
export function clearAllCache(): void {
	if (typeof window === 'undefined' || !window.sessionStorage) {
		return;
	}

	const keysToRemove: string[] = [];

	for (let i = 0; i < sessionStorage.length; i++) {
		const key = sessionStorage.key(i);
		if (key && key.startsWith(CACHE_PREFIX)) {
			keysToRemove.push(key);
		}
	}

	keysToRemove.forEach((key) => sessionStorage.removeItem(key));
	console.log(`[MermaidCache] Cleared ${keysToRemove.length} cache entries`);
}
