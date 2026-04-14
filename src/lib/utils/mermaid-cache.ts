// Session-scoped in-memory cache for rendered Mermaid SVGs. A plain Map is
// sufficient — the prior sessionStorage implementation added quota handling,
// TTL, and a hash function for a blog small enough that none applied. Cache
// survives client-side navigation between posts; cleared on full reload.

const cache = new Map<string, string>();

export function getCachedSVG(diagram: string): string | null {
  return cache.get(diagram) ?? null;
}

export function setCachedSVG(diagram: string, svg: string): void {
  cache.set(diagram, svg);
}
