# Deno Runtime & Build

## Overview

wcygan.net uses Deno as the JavaScript runtime, task runner, and dependency
installer while keeping `package.json` for npm package metadata.

## Commands

```bash
deno task dev         # Start Vite dev server through portless
deno task dev-vite    # Start bare Vite on port 3000
deno task build       # Production build via Vite builder + Nitro deno-server preset
deno task preview     # Preview production build
deno task test        # Run Vitest
deno task pre-commit  # Format + typecheck + tests
```

## Package Management

```bash
deno install              # Install from deno.lock
deno install npm:<pkg>    # Add dependency to package.json
deno install -D npm:<pkg> # Add dev dependency to package.json
deno remove <pkg>         # Remove dependency
```

- Lock file: `deno.lock`
- `deno.json` owns tasks and Deno-specific settings.
- `package.json` remains the npm dependency manifest for Vite, React, and related packages.

## Deployment: Nitro + Deno Preset

The production build uses Nitro with the `deno-server` preset, configured in
`vite.config.ts`:

```ts
import { nitro } from "nitro/vite";
// ...
plugins: [nitro({ preset: "deno-server" })];
```

The build prerenders static assets to `.output/public`. Cloudflare Workers
Assets deploys only that directory; the `.output/server` bundle is just the
server TanStack Start probes during prerender.

## Vite Integration

Deno runs Vite through `deno task`. The `vite.config.ts` uses Vite 7 with these
plugins in order:

1. `@mdx-js/rollup` — MDX compilation (must come before React)
2. `@tanstack/react-start/plugin/vite` — TanStack Start SSR
3. `@vitejs/plugin-react` — React JSX transform
4. `nitro/vite` — Production server build

## Key Files

- `deno.json` — tasks, import map, Deno node_modules mode
- `package.json` — npm dependencies and compatibility scripts
- `deno.lock` — dependency lock file
- `vite.config.ts` — build configuration
- `tsconfig.json` — TypeScript config (target ES2022, JSX react-jsx)
