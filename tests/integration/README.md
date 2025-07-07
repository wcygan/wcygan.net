# Mermaid Diagram Integration Tests

Comprehensive E2E tests for all Mermaid diagram types used in the blog.

## Test Coverage

- **Flow Chart** - Deployment pipeline diagrams
- **Sequence** - API authentication flows
- **State** - Order processing states
- **Git Graph** - Branch and commit visualization
- **Entity Relationship** - Database schemas
- **Pie Chart** - Technology stack distribution
- **Viewport Loading** - Lazy loading behavior
- **Caching** - SessionStorage persistence
- **Error Handling** - Invalid syntax recovery
- **Responsive Design** - Mobile viewport testing
- **Accessibility** - ARIA labels and roles

## Running Tests

### With Global Server Setup (Recommended)

The tests now use a global server setup that automatically starts a Vite preview server:

```bash
# Build the project first (if not already built)
pnpm run build

# Run integration tests (server starts/stops automatically)
NODE_OPTIONS="" pnpm run test:integration

# Or run specific test file
NODE_OPTIONS="" pnpm run test:integration tests/integration/example-global-server.test.ts
```

### Manual Server Setup (Legacy)

```bash
# Start dev server in one terminal
pnpm run dev

# Run integration tests in another terminal
NODE_OPTIONS="" pnpm run test:integration tests/integration/mermaid-complete.test.ts
```

## Test Files

### Core Infrastructure

- `globalServer.ts` - Global setup/teardown for Vite preview server
- `testUtils.ts` - Helper utilities for getting base URL and common configs
- `global.d.ts` - TypeScript declarations for environment variables

### Test Suites

- `example-global-server.test.ts` - Example using global server setup
- `mermaid-diagrams.test.ts` - Comprehensive tests with preview server
- `mermaid-complete.test.ts` - Simplified tests using dev server
- `mermaid-diagrams-simple.test.ts` - Basic smoke tests

### Usage

To use the global server setup in your tests:

```typescript
import { getTestBaseUrl, defaultBrowserConfig, defaultViewport } from './testUtils';

// Get the server URL set by global setup
const baseUrl = getTestBaseUrl(); // Returns 'http://localhost:4173'

// Use provided browser config for consistency
const browser = await puppeteer.launch(defaultBrowserConfig);
```

## Environment Variables

The integration test system uses the following environment variables:

### Automatically Managed

- **`VITE_TEST_BASE_URL`**: Set by global server setup to `http://localhost:4173`
  - Used by `getTestBaseUrl()` utility function
  - Automatically cleaned up after tests complete
  - Points to the Vite preview server instance

### Manual Override Options

- **`BASE_URL`**: Alternative base URL for manual testing

  - Example: `BASE_URL="http://localhost:5173"` for dev server
  - Fallback when `VITE_TEST_BASE_URL` is not set

- **`NODE_OPTIONS`**: Recommended to set to empty string
  - Prevents Node.js warnings in test output
  - Usage: `NODE_OPTIONS="" pnpm run test:integration`

### Configuration Priority

The `getTestBaseUrl()` function checks environment variables in this order:

1. `process.env.VITE_TEST_BASE_URL` (global server setup)
2. `process.env.BASE_URL` (manual override)
3. `global.__BASE_URL__` (legacy global variable)
4. `'http://localhost:4173'` (default fallback)

## Test Configuration

### Timeouts

- **Test timeout**: 45,000ms (45 seconds) - Extended for Mermaid rendering
- **Hook timeout**: 60,000ms (60 seconds) - For server startup and browser launch
- **Server readiness**: 30,000ms (30 seconds) - HTTP health check timeout
- **Mermaid rendering**: 15,000ms (15 seconds) - Default diagram wait timeout

### Server Settings

- **Port**: 4173 (Vite preview server)
- **Host**: localhost
- **Strict port**: Enabled (fails if port is occupied)
- **Auto-build**: Builds project if `/build` directory missing

### Browser Configuration

- **Engine**: Chromium via Puppeteer
- **Mode**: Headless (configurable via `defaultBrowserConfig`)
- **Viewport**: 1280x720 (configurable via `defaultViewport`)
- **Args**: `['--no-sandbox', '--disable-setuid-sandbox']` for CI compatibility

## Requirements

- Node.js 18+ (required for built-in fetch API)
- Puppeteer (installed via pnpm)
- Built site in `/build` directory
- Available port 4173 for test server
