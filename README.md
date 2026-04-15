# wcygan.net

This is the source code for my personal website,
[wcygan.net](https://wcygan.net).

[![CI](https://github.com/wcygan/wcygan.net/actions/workflows/ci.yml/badge.svg)](https://github.com/wcygan/wcygan.net/actions/workflows/ci.yml)
[![Deploy](https://github.com/wcygan/wcygan.net/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/wcygan/wcygan.net/actions/workflows/deploy-cloudflare.yml)
[![Security](https://github.com/wcygan/wcygan.net/actions/workflows/security.yml/badge.svg)](https://github.com/wcygan/wcygan.net/actions/workflows/security.yml)
[![Performance](https://github.com/wcygan/wcygan.net/actions/workflows/performance.yml/badge.svg)](https://github.com/wcygan/wcygan.net/actions/workflows/performance.yml)

Managed on https://dash.cloudflare.com/

## Quickstart

Install [bun](https://bun.sh/), [just](https://github.com/casey/just), and
[uv](https://docs.astral.sh/uv/).

```bash
just install
just dev
```

Task runner recipes live in the `justfile` — run `just` to list them. Python
helpers are executed via `uv run`.

## Create a new post

Drop a new `.mdx` file into `src/posts/` with YAML frontmatter (`title`, `date`,
`description`, `tags`). It will appear automatically on the homepage and
`/posts`.

## Download Resume

The latest resume PDF lives in `public/` and is updated manually — no task
recipe is wired up yet.

## Integration Testing

The project includes comprehensive end-to-end integration tests for Mermaid diagram rendering using Puppeteer and Vitest.

### Prerequisites

- Node.js 18+ (required for built-in fetch API)
- Built project in `/build` directory
- All dependencies installed via `just install`

### Running Integration Tests

#### Recommended: Automated Server Setup

The integration tests use a global server setup that automatically manages the test server lifecycle:

```bash
# Build the project (required before integration tests)
just build

# Run all integration tests (server starts/stops automatically)
NODE_OPTIONS="" just test tests/integration

# Run specific test file
NODE_OPTIONS="" just test tests/integration/mermaid-diagrams.test.ts
```

#### Manual Server Setup (Legacy)

For debugging or development purposes, you can manually control the server:

```bash
# Terminal 1: Start development server
just dev

# Terminal 2: Run integration tests against dev server
NODE_OPTIONS="" BASE_URL="http://localhost:5173" just test tests/integration
```

### Environment Variables

The integration tests support the following environment variables:

- `VITE_TEST_BASE_URL`: Set automatically by global server setup (default: `http://localhost:4173`)
- `BASE_URL`: Alternative base URL for manual testing (fallback option)
- `NODE_OPTIONS`: Set to empty string to avoid Node.js warnings in test output

### Test Configuration

- **Test timeout**: 45 seconds (extended for Mermaid rendering)
- **Hook timeout**: 60 seconds (for server startup and browser launch)
- **Server port**: 4173 (Vite preview server)
- **Browser**: Chromium via Puppeteer (headless by default)

### Test Coverage

The integration tests cover:

- **Mermaid Diagram Types**: Flow charts, sequence diagrams, state diagrams, Git graphs, ER diagrams, pie charts
- **Rendering Behavior**: Lazy loading, caching (SessionStorage), error handling
- **Responsive Design**: Mobile viewport testing
- **Accessibility**: ARIA labels and roles
- **Performance**: Diagram loading and rendering times

### Troubleshooting

**Build directory missing:**

```bash
just build
```

**Port already in use:**
The global setup uses `strictPort: true` and will fail if port 4173 is occupied. Stop any existing servers on that port.

**Browser launch failures:**
Ensure you have sufficient system resources and no conflicting browser processes.

**Timeout errors:**
Mermaid diagrams can take time to render. The tests include enhanced waiting utilities with proper timeout handling.

For more detailed information about the integration test architecture, see `tests/integration/README.md`.

## CI Testing

Run the full quality gate locally (format + typecheck + test):

```bash
just check
```

Verify production after a deploy:

```bash
just verify-prod
```
