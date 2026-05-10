# wcygan.net task runner
set shell := ["bash", "-uc"]

# List available recipes
default:
    @just --list

# Development
# ---------------------------------------------------------------------------

# Start the dev server at https://wcygan.localhost (portless wraps Vite)
dev:
    (sleep 2 && open https://wcygan.localhost) &
    deno task dev

# Start the bare Vite dev server on :3000 (CI / no-portless fallback)
dev-vite:
    deno task dev-vite

# Build for production (Nitro + Deno)
build:
    deno task build

# Preview the production build
preview:
    deno task preview

# Serve the built static output from .output/public
preview-static:
    deno task preview-static

# Quality & Testing
# ---------------------------------------------------------------------------

# Run Vitest unit tests (pass extra args: `just test --watch`)
test *args:
    deno task test {{args}}

# Format the repo with Prettier
fmt:
    deno task fmt

# Type-check without emitting
typecheck:
    deno task typecheck

# Format + typecheck + tests (matches package.json pre-commit)
check: fmt typecheck test
    @echo "All checks passed"

# Lifecycle
# ---------------------------------------------------------------------------

# Install JS dependencies
install:
    deno install

# Remove build artifacts
clean:
    rm -rf .output dist build node_modules/.vite

# Deployment
# ---------------------------------------------------------------------------

# Build and deploy to Cloudflare via Wrangler
deploy:
    deno task deploy

# Hit production with the regression suite (scripts/verify-prod.sh)
verify-prod *args:
    scripts/verify-prod.sh {{args}}
