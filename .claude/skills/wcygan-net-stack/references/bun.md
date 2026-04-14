# Bun Runtime & Build

## Overview

wcygan.net uses Bun as the runtime and package manager, replacing Node.js + pnpm from the previous SvelteKit stack.

## Commands

```bash
bun run dev           # Start Vite dev server on port 3000 (uses bun --bun)
bun run build         # Production build via Nitro with bun preset
bun run start         # Start production server (.output/server/index.mjs)
bun run preview       # Preview production build
bun run test          # Run Vitest
bun run pre-commit    # Format + typecheck
```

The `--bun` flag in `bun --bun vite dev` forces Vite to use the Bun runtime instead of falling back to Node.js. This is set in the `package.json` scripts.

## Package Management

```bash
bun add <package>        # Add dependency
bun add -d <package>     # Add dev dependency
bun remove <package>     # Remove dependency
bun install              # Install from bun.lock
```

- Lock file: `bun.lock` (not `pnpm-lock.yaml` or `package-lock.json`)
- No `.npmrc` or `.pnpmrc` needed

## Deployment: Nitro + Bun Preset

The production build uses Nitro with the `bun` preset, configured in `vite.config.ts`:

```ts
import { nitro } from "nitro/vite";
// ...
plugins: [nitro({ preset: "bun" })];
```

Build output goes to `.output/server/index.mjs`. Run with:

```bash
bun .output/server/index.mjs
```

The `PORT` environment variable controls the server port (default 3000).

## Vite Integration

Bun runs Vite directly. The `vite.config.ts` uses Vite 8 with these plugins in order:

1. `@mdx-js/rollup` — MDX compilation (must come before React)
2. `@tanstack/react-start/plugin/vite` — TanStack Start SSR
3. `@vitejs/plugin-react` — React JSX transform
4. `nitro/vite` — Production server build

## Key Files

- `package.json` — scripts, deps (type: "module")
- `bun.lock` — dependency lock file
- `vite.config.ts` — build configuration
- `tsconfig.json` — TypeScript config (target ES2022, JSX react-jsx)
