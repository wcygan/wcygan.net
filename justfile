# wcygan.net task runner
set shell := ["bash", "-uc"]

# List available recipes
default:
    @just --list

# Development
# ---------------------------------------------------------------------------

# Start the dev server; linked worktrees get their own Portless URL
dev:
    bun run dev

# Start the bare Vite dev server on :3000 (CI / no-portless fallback)
dev-vite:
    bun run dev-vite

# Build for production (Nitro + Bun)
build:
    bun run build

# Preview the production build
preview:
    bun run preview

# Serve the built static output from .output/public
preview-static:
    bun run preview-static

# Quality & Testing
# ---------------------------------------------------------------------------

# Run Vitest unit tests (pass extra args: `just test --watch`)
test *args:
    bun run test {{args}}

# Format the repo with Prettier
fmt:
    bun run fmt

# Type-check without emitting
typecheck:
    bun run typecheck

# Format + typecheck + tests (matches package.json pre-commit)
check: fmt typecheck test
    @echo "All checks passed"

# Lifecycle
# ---------------------------------------------------------------------------

# Install JS dependencies
install:
    bun install

# Remove build artifacts
clean:
    rm -rf .output dist build node_modules/.vite

# Deployment
# ---------------------------------------------------------------------------

# Build and deploy to Cloudflare via Wrangler
deploy:
    bun run deploy

# Hit production with the regression suite (scripts/verify-prod.sh)
verify-prod *args:
    scripts/verify-prod.sh {{args}}
