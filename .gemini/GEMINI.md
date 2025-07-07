# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Essential Commands

### Development

```bash
pnpm run dev          # Start development server on localhost:5173
pnpm run preview      # Preview production build locally
```

### Code Quality & Testing

```bash
pnpm run format       # Format code with Prettier
pnpm run lint         # Run ESLint checks
pnpm run check        # Type check with svelte-check
pnpm run test         # Run Vitest unit tests

# Run all checks before committing
pnpm run format && pnpm run lint && pnpm run check && pnpm run test
```

### Building & Deployment

```bash
pnpm run build        # Build static site to /build directory
```

### Content Management

```bash
pnpm run post         # Create new blog post interactively
```

### CI Testing (Local)

```bash
pnpm ci:test          # Test all GitHub Actions locally with act
pnpm ci:test:quick    # Quick CI workflow test
```

## Architecture Overview

### Technology Stack

- **SvelteKit 2.15+** with static adapter for GitHub Pages deployment
- **Svelte 5** - Latest major version with runes
- **MDsveX** for Markdown blog posts with syntax highlighting (Shiki)
- **Tailwind CSS** for styling with Typography plugin
- **TypeScript** with strict mode enabled
- **Vitest** for testing (minimal coverage currently)

### Key Architectural Decisions

#### Blog System

- Blog posts are Markdown files in `/src/posts/`
- Dynamic routing via `/src/routes/blog/[slug]/+page.svelte`
- Metadata (title, date, tags, description) in frontmatter
- Automatic reading time calculation
- RSS feed generation at `/rss.xml`

#### Static Site Generation

- Uses `@sveltejs/adapter-static` for GitHub Pages
- All routes pre-rendered at build time
- Custom 404.html for GitHub Pages fallback
- Build output in `/build` directory

#### Component Architecture

- Shared components in `/src/lib/components/`
- Business logic in `/src/lib/services/`
- Type definitions in `/src/lib/types.ts`
- Utility functions in `/src/lib/utils/`

### Development Patterns

#### Adding New Blog Posts

1. Run `pnpm run post` or create file manually in `/src/posts/`
2. Use frontmatter: title, date, tags, description, published
3. Posts automatically appear in blog listing and RSS feed

#### Using Mermaid Diagrams in Posts

Mermaid diagrams are supported in blog posts for creating flowcharts, sequence
diagrams, and more.

**Basic Usage:**

```svelte
<script>
	import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
</script>

<MermaidDiagram
	height={300}
	diagram={`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do this]
    B -->|No| D[Do that]`}
/>
```

**Available Components:**

- `MermaidDiagram` - Main component with caching and error handling
- `MermaidViewport` - Lazy-loads when scrolled into view
- `MermaidFlexible` - Supports both prop and slot syntax

**Performance Tips:**

- Diagrams are automatically cached in sessionStorage
- Use `MermaidViewport` for diagrams below the fold
- See `/docs/MERMAID_USAGE.md` for comprehensive guide
- Visit `/mermaid-examples` for live examples

#### Modifying Routes

- Page routes in `/src/routes/[route]/+page.svelte`
- Load functions in `+page.ts` files
- Layout in `/src/routes/+layout.svelte`

#### Working with Scripts

- Automation scripts in `/scripts/` directory
- GitHub Actions testing uses `act` tool
- Resume download script fetches from external repo

### Testing Approach

- Unit tests with Vitest (run with `pnpm run test`)
- Local GitHub Actions testing with comprehensive test suite
- VS Code task integration for quick testing

### Important Configuration Files

- `svelte.config.js` - SvelteKit and MDsveX configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Tailwind customization
- `mdsvex.config.js` - Markdown processing and syntax highlighting
