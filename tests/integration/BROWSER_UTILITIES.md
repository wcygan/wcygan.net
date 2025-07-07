# Browser Utilities for Integration Tests

This document describes the consolidated browser launch and teardown system for Puppeteer-based integration tests.

## Overview

The browser utilities provide a shared browser instance that can be reused across multiple test files, reducing test execution time and resource usage. The system exposes `global.__BROWSER__` for shared access and provides convenient utility functions.

## Architecture

### Core Files

- `browserUtils.ts` - Main browser utility functions
- `testUtils.ts` - Re-exports browser utilities for convenience
- `global.d.ts` - TypeScript declarations for global browser instance
- `globalServer.ts` - Optional global browser setup (currently disabled)

### Key Functions

```typescript
// Launch shared browser instance
await launchBrowser(config?: BrowserConfig): Promise<Browser>

// Close shared browser instance
await closeBrowser(browser?: Browser): Promise<void>

// Create new page from shared browser
await createPage(viewport?: Viewport): Promise<Page>

// Close page safely
await closePage(page?: Page): Promise<void>

// Get shared browser instance
getBrowser(): Browser | undefined

// Check if browser is available
hasBrowser(): boolean
```

## Usage Patterns

### Pattern 1: Test-Level Browser Management (Recommended)

Each test file manages its own browser lifecycle:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Page } from 'puppeteer';
import { launchBrowser, closeBrowser, createPage, closePage, getTestBaseUrl } from './testUtils';

describe('My Integration Tests', () => {
	let page: Page;
	const baseUrl = getTestBaseUrl();

	beforeAll(async () => {
		// Launch shared browser instance for this test suite
		await launchBrowser();
	});

	afterAll(async () => {
		// Close shared browser instance
		await closeBrowser();
	});

	beforeEach(async () => {
		// Create new page from shared browser
		page = await createPage();
	});

	afterEach(async () => {
		// Close page
		await closePage(page);
	});

	it('should work', async () => {
		await page.goto(baseUrl);
		// ... test logic
	});
});
```

### Pattern 2: Per-Test Page Management

For tests that need isolated pages:

```typescript
it('should work with isolated page', async () => {
	const page = await createPage();
	try {
		await page.goto(baseUrl);
		// ... test logic
	} finally {
		await closePage(page);
	}
});
```

### Pattern 3: Direct Browser Access

For tests that need direct browser access:

```typescript
import { getBrowser } from './testUtils';

it('should access browser directly', async () => {
	const browser = getBrowser();
	if (!browser) throw new Error('No browser available');

	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	// ... test logic
	await context.close();
});
```

## Global Browser Access

The shared browser instance is available globally:

```typescript
// TypeScript support
declare global {
	var __BROWSER__: Browser | undefined;
}

// Access in tests
const browser = global.__BROWSER__;
```

## Configuration

### Default Browser Config

```typescript
export const defaultBrowserConfig = {
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox']
};
```

### Default Viewport

```typescript
export const defaultViewport = {
	width: 1280,
	height: 720
};
```

### Custom Configuration

```typescript
// Custom browser config
await launchBrowser({
	headless: false,
	args: ['--no-sandbox'],
	devtools: true
});

// Custom viewport
const page = await createPage({
	width: 375,
	height: 667
});
```

## Migration Guide

### Before (Old Pattern)

```typescript
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

describe('Old Pattern', () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		});
	});

	afterAll(async () => {
		await browser?.close();
	});

	beforeEach(async () => {
		page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 720 });
	});

	afterEach(async () => {
		await page?.close();
	});
});
```

### After (New Pattern)

```typescript
import type { Page } from 'puppeteer';
import { launchBrowser, closeBrowser, createPage, closePage } from './testUtils';

describe('New Pattern', () => {
	let page: Page;

	beforeAll(async () => {
		await launchBrowser();
	});

	afterAll(async () => {
		await closeBrowser();
	});

	beforeEach(async () => {
		page = await createPage();
	});

	afterEach(async () => {
		await closePage(page);
	});
});
```

## Benefits

1. **Reduced Boilerplate** - Simplified browser setup across test files
2. **Consistent Configuration** - Centralized browser and viewport configuration
3. **Better Resource Management** - Proper error handling and cleanup
4. **Global Access** - `global.__BROWSER__` available when needed
5. **Flexible Usage** - Multiple usage patterns for different needs
6. **Type Safety** - Full TypeScript support with proper declarations

## Error Handling

The utilities include comprehensive error handling:

- Safe browser launch with detailed error messages
- Graceful browser/page closure even if already closed
- Validation that browser exists before creating pages
- Console logging for debugging launch/close issues

## Best Practices

1. **Use `launchBrowser()` in `beforeAll`** - Launch once per test suite
2. **Use `createPage()` in `beforeEach`** - Fresh page per test
3. **Always close resources** - Use `afterAll` and `afterEach` hooks
4. **Handle errors gracefully** - Wrap in try/finally blocks when needed
5. **Use consistent configuration** - Leverage default configs when possible

## Examples

See the updated test files for complete examples:

- `example-global-server.test.ts` - Basic usage pattern
- `mermaid-diagrams.test.ts` - Complex test suite with multiple describe blocks
- `mermaid-complete.test.ts` - Comprehensive testing with beforeEach/afterEach

## Future Enhancements

Potential future improvements:

1. **Global Browser Pool** - Share browser across all test files
2. **Browser Recycling** - Reuse browser instances between test runs
3. **Parallel Testing** - Multiple browser instances for parallel execution
4. **Configuration Profiles** - Predefined configs for different test types
5. **Performance Monitoring** - Track browser launch/page creation times
