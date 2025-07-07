# Contributing to wcygan.github.io

Thank you for your interest in contributing to this project! This guide will help you get started with the development workflow and testing procedures.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Git

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/wcygan/wcygan.github.io.git
   cd wcygan.github.io
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm run dev
   ```

4. **Build the project**
   ```bash
   pnpm run build
   ```

## Testing Workflow

### Unit Tests

Run component and utility unit tests:

```bash
pnpm run test:unit

# Or with file watching
pnpm run test:unit -- --watch
```

### Integration Tests

The project includes comprehensive end-to-end integration tests for Mermaid diagram rendering.

#### Quick Start

```bash
# Build the project first
pnpm run build

# Run all integration tests
NODE_OPTIONS="" pnpm run test:integration
```

#### Environment Variables

- **`VITE_TEST_BASE_URL`**: Automatically set by global server setup (`http://localhost:4173`)
- **`BASE_URL`**: Manual override for custom server URL
- **`NODE_OPTIONS`**: Set to `""` to suppress Node.js warnings

#### Test Architecture

The integration tests use:

- **Vitest** as the test runner
- **Puppeteer** for browser automation
- **Global server setup** that automatically starts/stops a Vite preview server
- **Enhanced waiting utilities** for Mermaid diagram rendering

#### Running Specific Tests

```bash
# Run specific test file
NODE_OPTIONS="" pnpm run test:integration tests/integration/mermaid-diagrams.test.ts

# Run with verbose output
NODE_OPTIONS="" pnpm run test:integration -- --reporter=verbose
```

#### Debugging Integration Tests

For debugging, you can run tests against a manual development server:

```bash
# Terminal 1: Start dev server
pnpm run dev

# Terminal 2: Run tests against dev server
NODE_OPTIONS="" BASE_URL="http://localhost:5173" pnpm run test:integration
```

### CI Testing

Test GitHub Actions workflows locally using Act:

```bash
# Quick CI test
pnpm run ci:test:quick

# Full CI test suite
pnpm run ci:test

# Test specific workflow
pnpm run ci:test:ci
```

## Code Quality

### Formatting and Linting

```bash
# Check code formatting and linting
pnpm run lint

# Auto-fix formatting issues
pnpm run format
```

### Type Checking

```bash
# Run Svelte type checking
pnpm run check

# With file watching
pnpm run check:watch
```

## Creating New Content

### Blog Posts

Create a new blog post with interactive scaffolding:

```bash
pnpm run post
```

This will prompt you for:

- Post title
- URL slug
- Brief description
- Tags

### Mermaid Diagrams

When adding new Mermaid diagrams to posts:

1. Use the `MermaidDiagram` component
2. Add appropriate `aria-label` descriptions
3. Test responsiveness on mobile viewports
4. Verify caching behavior

Example:

```svelte
<MermaidDiagram
	height={400}
	diagram={`
    graph TD
      A[Start] --> B[Process]
      B --> C[End]
  `}
/>
```

## Testing Guidelines

### When to Write Integration Tests

Write integration tests when:

- Adding new Mermaid diagram types
- Modifying diagram rendering behavior
- Changing responsive design implementations
- Updating accessibility features

### Test Structure

Follow this pattern for new integration tests:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { Page } from 'puppeteer';
import {
	launchBrowser,
	closeBrowser,
	createPage,
	closePage,
	getTestBaseUrl,
	waitForMermaidDiagrams
} from './testUtils';

describe('Feature Tests', () => {
	let page: Page;
	const baseUrl = getTestBaseUrl();

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

	it('should test feature', async () => {
		await page.goto(`${baseUrl}/test-page`);
		await waitForMermaidDiagrams(page, 2, 15000);

		// Test assertions here
	});
});
```

## Troubleshooting

### Common Issues

**Integration tests failing with port errors:**

- Ensure port 4173 is available
- Stop any existing Vite preview servers
- The global setup uses `strictPort: true`

**Browser launch failures:**

- Check system resources
- Ensure no conflicting Puppeteer processes
- Try clearing browser cache/data

**Mermaid rendering timeouts:**

- Diagrams can take time to render complex layouts
- Use `waitForMermaidDiagrams()` utility
- Increase timeout if necessary for complex diagrams

**Build directory missing:**

```bash
pnpm run build
```

### Getting Help

- Check existing [issues](https://github.com/wcygan/wcygan.github.io/issues)
- Review test logs for specific error messages
- See `tests/integration/README.md` for detailed test documentation

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   pnpm run lint
   pnpm run test:unit
   pnpm run build
   NODE_OPTIONS="" pnpm run test:integration
   ```

4. **Commit your changes**

   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Wait for CI checks**
   - All tests must pass
   - Code must pass linting
   - Build must succeed

## Questions?

Feel free to open an issue if you have questions about the development workflow or need help with testing procedures.
