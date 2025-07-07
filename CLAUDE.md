# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Essential Commands

### Development

```bash
# Initial setup for new installation
pnpm install && pnpm build && vite dev --open

# Start development server
pnpm run dev          # Start development server on localhost:5173
pnpm run preview      # Preview production build locally

# Development with custom port (useful for git worktrees)
vite dev --port 8989  # Use different port for testing multiple versions
```

### Code Quality & Testing

```bash
pnpm run format       # Format code with Prettier (includes Mermaid formatting fix)
pnpm run format:check # Check formatting without writing changes
pnpm run lint         # Run ESLint checks
pnpm run check        # Type check with svelte-check
pnpm run test         # Run Vitest unit tests

# Automated Mermaid formatting fix (prevents MDsveX parsing issues)
deno task fix-mermaid # Fix Mermaid diagram formatting automatically

# Complete pre-commit workflow
pnpm run pre-commit   # Fix Mermaid + format + lint + typecheck
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
- **Dual Package Management**: `deno.json` for Deno scripts + `package.json` for pnpm workflow

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

**Styling Guidelines:**

- Follow the style guide in `/docs/MERMAID_STYLE_GUIDE.md`
- Quick implementation reference in `/docs/MERMAID_IMPLEMENTATION.md`
- Dark theme with zinc/emerald color palette
- Consistent 2px borders and Inter font family

**Automated Mermaid Formatting Fix**

The project includes an automated solution to prevent MDsveX parsing issues with Mermaid diagrams:

```bash
# Automatically fix Mermaid formatting issues
deno task fix-mermaid

# Integrated into formatting workflow
pnpm run format  # Now includes automatic Mermaid fix

# Complete pre-commit check (recommended)
pnpm run pre-commit
```

**How It Works:**

- Scans all `.md` files in `src/posts/`
- Removes empty lines within Mermaid diagram definitions that cause MDsveX to inject `</p>` tags
- Integrates seamlessly with existing pnpm workflow
- Prevents build failures from Mermaid parsing errors

**Manual Formatting Rules (if needed):**

1. **Component Formatting Pattern:**

   ```svelte
   <!-- ✅ CORRECT: No empty lines in diagram content -->
   <MermaidDiagram
   	height={500}
   	diagram={`sequenceDiagram
       participant User
       participant Server
       User->>Server: Request
       Server->>User: Response`}
   />

   <!-- ❌ WRONG: Empty lines cause MDsveX to inject </p> tags -->
   <MermaidDiagram
   	height={500}
   	diagram={`sequenceDiagram

   participant User
   participant Server
   User->>Server: Request
   Server->>User: Response`}
   />
   ```

2. **Vite Configuration:**

   Ensure `vite.config.ts` has the correct Mermaid alias:

   ```typescript
   resolve: {
   	alias: {
   		mermaid: 'mermaid/dist/mermaid.esm.min.mjs'; // NOT mermaid.esm.mjs
   	}
   }
   ```

3. **Svelte 5 Compatibility:**

   - For components using `bind:textContent`, add `contenteditable="true"`
   - Use `onMount` with `tick()` for reliable DOM access
   - Avoid using `$app/environment` for browser detection; use `onMount` instead

4. **Common Issues and Solutions:**

   - **SSR/Hydration failures**: Check Vite module resolution config
   - **MDsveX paragraph wrapping**: Use the formatting pattern above
   - **Slot content not working**: Ensure proper `onMount` handling in components
   - **Direct URL access fails**: Verify module aliases and SSR configuration

#### Mermaid Diagram Styling

The application uses a consistent dark theme for all Mermaid diagrams:

**Color Palette:**

- Background: `zinc-900` (#18181b)
- Node fills: `zinc-700` (#3f3f46) - NEVER use emerald fill alone
- Node borders: `emerald-400` (#34d399)
- Text: `zinc-100` (#e4e4e7)
- Edges/Lines: `zinc-500` (#71717a)
- Emphasis: Use `stroke-width:3px` instead of fill color

**Height Recommendations:**

- Simple flowcharts: 300-400px
- Sequence diagrams: 500-600px
- Complex diagrams: 500-800px
- Git graphs: 250-300px

**Quick Reference:**

```svelte
<MermaidDiagram
  height={400}
  diagram={`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[End]`}
/>
```

See `/docs/MERMAID_STYLE_GUIDE.md` for complete styling specifications and `/docs/MERMAID_IMPLEMENTATION.md` for implementation patterns.

#### Blog Post Styling Patterns

The project includes reusable styling components for creating engaging blog posts with consistent visual design:

**Available Patterns:**

- **Info Boxes**: Two types for content hierarchy
  - **Key Concept** (Emerald): Primary takeaways and most important information
  - **Key Insight** (Zinc): Secondary information and technical notes
- **Collapsible Sections**: Progressive disclosure using `<details>` tags
- **Feature Grids**: Icon-based grids for listing features or concepts
- **Component Cards**: Descriptive cards for explaining multiple related items
- **Example Boxes**: Structured conversation/process flows
- **Visual Separators**: Using `---` for clear section breaks

**Quick Examples:**

````html
<!-- Key Concept Box -->
<div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4 my-6">
  <h4 class="text-emerald-400 font-semibold mb-2">✨ Key Concept</h4>
  <p class="text-zinc-100">Important insight or concept here.</p>
</div>

<!-- Collapsible Code -->
<details>
<summary><strong>📋 View Code</strong></summary>

```typescript
// Hidden by default
const code = "example";
````

</details>

<!-- Feature Icons -->

<div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
  <div class="text-center">
    <div class="text-2xl mb-1">🚀</div>
    <div class="text-sm text-zinc-300">Fast</div>
  </div>
</div>
```

**MDsveX Considerations:**

- Escape curly braces in HTML: `&#123;` and `&#125;`
- Avoid empty lines in component props
- Use semantic HTML for better accessibility

**HTML/Markdown Mixing Rules:**

- **NEVER mix HTML `<li>` with manual bullet points (`•`)** - HTML handles bullets automatically
- **Use HTML `<strong>` instead of Markdown `**bold**` inside HTML contexts** - Markdown doesn't process inside HTML tags
- **Examples:**

  ```html
  <!-- ✅ CORRECT: HTML list with HTML bold -->
  <ul>
    <li><strong>Key Point</strong>: Description here</li>
  </ul>

  <!-- ❌ WRONG: Double bullets and broken bold -->
  <ul>
    <li>• **Key Point**: Description here</li>
  </ul>
  ```

See `/docs/BLOG_POST_STYLING.md` for complete patterns, templates, and best practices.

#### Component Styling Guidelines

The project follows a consistent design system with established patterns for card components and UI elements:

**Design System Foundations:**

- **Color Palette**: Dark theme with zinc backgrounds and emerald accents
- **Primary Background**: `bg-zinc-700` for all card components
- **Border Colors**: `border-zinc-700` with `hover:border-emerald-400`
- **Text Hierarchy**: `text-zinc-100` (primary), `text-zinc-300` (body), `text-zinc-400` (muted)
- **Accent Color**: `text-emerald-400` for headings and highlights

**Card Component Standards:**

All card components should follow these consistent patterns:

```svelte
<!-- Standard card structure -->
<li class="card-base card-hover border border-zinc-700 hover:border-emerald-400">
  <header class="mb-3 flex items-baseline justify-between">
    <span class="text-lg font-semibold tracking-wide text-zinc-100">
      Primary Title
    </span>
    <time class="text-sm text-zinc-400">Time/Date</time>
  </header>

  <h3 class="mb-2 text-base font-medium text-emerald-400">
    Secondary Title
  </h3>

  <p class="mb-4 text-sm leading-relaxed text-zinc-300">
    Description content
  </p>

  <!-- Technology tags or metadata -->
  <div class="flex flex-wrap gap-2">
    <span class="rounded bg-emerald-600/20 px-2 py-1 text-sm text-emerald-300">
      Tag
    </span>
  </div>
</li>
```

**CSS Class System:**

Use the established CSS classes from `app.css`:

- `.card-base` - Provides `bg-zinc-700`, rounded corners, padding, transitions
- `.card-hover` - Adds subtle lift effect (`hover:-translate-y-1 hover:shadow-lg`)
- Avoid inline `bg-zinc-800` - always use `bg-zinc-700` for consistency

**Component Data Patterns:**

Structure data files following the established interface patterns:

```typescript
// Example interface structure
export interface ComponentData {
  id: string;           // Unique identifier
  title: string;        // Primary display text
  period?: string;      // Time period (ISO-like format)
  summary: string;      // ≤ 25 words description
  location?: string;    // Optional location
  technologies?: string[]; // Technology tags
  achievements?: string[]; // Key accomplishments
}
```

**File Organization:**

- Component files: `/src/lib/components/ComponentName.svelte`
- Data files: `/src/lib/data/componentData.ts`
- Type definitions: Add interfaces to `/src/lib/types.ts`

**Accessibility Requirements:**

- Use semantic HTML (`<header>`, `<time>`, proper heading hierarchy)
- Include `role="listitem"` for list-based cards
- Proper `datetime` attributes for time elements
- Maintain focus management with existing CSS patterns

**Responsive Design:**

- Grid layouts: `grid gap-6 md:grid-cols-1 lg:grid-cols-2`
- Mobile-first approach with `md:` and `lg:` breakpoints
- Consistent spacing: `mb-3`, `mb-4`, `mb-6` for vertical rhythm

**Technology Tag Styling:**

Always use the established tag pattern for consistency:

```svelte
<span class="rounded bg-emerald-600/20 px-2 py-1 text-sm text-emerald-300">
  {technology}
</span>
```

**Common Anti-Patterns to Avoid:**

- ❌ Using `bg-zinc-800` instead of `bg-zinc-700`
- ❌ Mixing custom CSS with Tailwind classes unnecessarily
- ❌ Inconsistent text color hierarchy
- ❌ Different hover effects across components
- ❌ Inline styles instead of established CSS classes

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
- 77 tests covering utilities, services, and component logic

#### Unit Testing Strategy

Due to Svelte 5 compatibility issues with @testing-library/svelte, we use a logic-based testing approach:

```typescript
// Test component logic without full mounting
describe('MermaidDiagram component logic', () => {
	it('should use cached SVG when available', async () => {
		const cachedSVG = '<svg>cached diagram</svg>';
		const mockGetCachedSVG = getCachedSVG as ReturnType<typeof vi.fn>;
		mockGetCachedSVG.mockReturnValue(cachedSVG);

		// Test caching behavior
		const svg = getCachedSVG(diagram);
		expect(svg).toBe(cachedSVG);
	});
});
```

**Test Coverage:**

- `src/lib/utils/*.spec.ts` - Utility functions (mermaid-cache, readingTime)
- `src/lib/services/*.spec.ts` - Service layer (blog filtering, sorting)
- `src/lib/components/*.test.ts` - Component logic (no full mounting)

**Key Testing Utilities:**

- Mock IntersectionObserver for viewport tests
- Mock sessionStorage for caching tests
- Mock Mermaid module for rendering tests

#### Browser Testing with Puppeteer MCP

The Puppeteer MCP tool can be used for end-to-end testing of Mermaid diagrams and blog functionality:

```typescript
// Example: Testing Mermaid diagram rendering
// 1. Navigate to a blog post with Mermaid diagrams
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173/blog/mermaid-diagrams'
});

// 2. Wait for diagram to render and take screenshot
await mcp__puppeteer__puppeteer_screenshot({
	name: 'mermaid-diagram-rendered',
	selector: '.mermaid-render-container',
	width: 800,
	height: 600
});

// 3. Test viewport lazy loading
await mcp__puppeteer__puppeteer_evaluate({
	script: `window.scrollTo(0, document.querySelector('.mermaid-viewport').offsetTop)`
});

// 4. Verify diagram loads when in viewport
await mcp__puppeteer__puppeteer_evaluate({
	script: `document.querySelector('.mermaid-render-container svg') !== null`
});
```

**Common E2E Test Scenarios:**

- Verify Mermaid diagrams render correctly
- Test lazy loading behavior with viewport scrolling
- Validate dark theme styling is applied
- Check sessionStorage caching works
- Test error states with invalid diagram syntax
- Verify blog post navigation and filtering

### Important Configuration Files

- `svelte.config.js` - SvelteKit and MDsveX configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Tailwind customization
- `mdsvex.config.js` - Markdown processing and syntax highlighting
- `deno.json` - Deno task definitions and JSR imports
- `package.json` - pnpm scripts and dependencies

### Dual Package Management

This project uses both `deno.json` and `package.json` for different purposes:

**`deno.json`:**

- Contains Deno-specific tasks (e.g., `fix-mermaid`)
- JSR imports for standard library modules
- Automation scripts that require file system access

**`package.json`:**

- Primary package manager is pnpm
- Contains SvelteKit, Vitest, and frontend tooling
- Integrates Deno tasks into pnpm workflow
- Main development and CI/CD scripts

**Task Resolution:**

- Deno can execute tasks from both files
- `pnpm run format` calls `deno task fix-mermaid` automatically
- Cross-calling between package managers works seamlessly
- Use `pnpm run <script>` for primary workflow commands
