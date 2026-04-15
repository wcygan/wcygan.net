# wcygan.net task runner
set shell := ["bash", "-uc"]

# List available recipes
default:
    @just --list

# Development
# ---------------------------------------------------------------------------

# Start the Vite dev server on :3000
dev:
    bun --bun vite dev

# Build for production (Nitro + Bun)
build:
    bun --bun vite build

# Preview the production build
preview:
    bun --bun vite preview

# Serve the built static output from .output/public
preview-static:
    bunx serve .output/public

# Quality & Testing
# ---------------------------------------------------------------------------

# Run Vitest unit tests (pass extra args: `just test --watch`)
test *args:
    bunx vitest run {{args}}

# Format the repo with Prettier
fmt:
    bunx prettier --write .

# Type-check without emitting
typecheck:
    bunx tsc --noEmit

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
    bun run build
    bunx wrangler deploy

# Hit production with the regression suite (scripts/verify-prod.sh)
verify-prod *args:
    scripts/verify-prod.sh {{args}}
