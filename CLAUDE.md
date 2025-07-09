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
pnpm run dev:wrangler # Test with Cloudflare Workers locally on localhost:8787

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
pnpm run build        # Build site for Cloudflare Workers

# Manual deployment (initial setup or emergency deployments)
npx wrangler login    # Authenticate with Cloudflare
pnpm run deploy       # Deploy to production manually
pnpm run deploy:preview  # Deploy to preview branch manually

# Automatic deployment (preferred)
# Connected via Workers Builds in Cloudflare Dashboard
git push origin main  # Automatically deploys to production
git push origin feature-branch  # Creates preview deployment

# Inspect deployment state
npx wrangler deployments list  # View recent deployments
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

- **SvelteKit 2.15+** with Cloudflare adapter for Workers deployment
- **Svelte 5** - Latest major version with runes
- **MDsveX** for Markdown blog posts with syntax highlighting (Shiki)
- **Tailwind CSS** for styling with Typography plugin
- **TypeScript** with strict mode enabled
- **Vitest** for testing (minimal coverage currently)
- **Wrangler CLI** for Cloudflare Workers deployment and management
- **Dual Package Management**: `deno.json` for Deno scripts + `package.json` for pnpm workflow

### Design System Tokens

#### Color System

**Primary Colors:**
- Primary: `#34d399` (emerald-400) - Main accent color
- Primary Hover: `#10b981` (emerald-500) - Hover state
- Primary Dark: `#059669` (emerald-600) - Dark variant

**Background Colors:**
- Base: `#18181b` (zinc-900) - Page background
- Surface: `#3f3f46` (zinc-700) - Card and component backgrounds
- Surface Dark: `#27272a` (zinc-800) - Darker surface (navbar, etc.)

**Text Colors:**
- Primary: `#f4f4f5` (zinc-100) - Primary text
- Secondary: `#d4d4d8` (zinc-300) - Secondary text
- Muted: `#a1a1aa` (zinc-400) - Muted text
- Inverse: `#18181b` (zinc-900) - Dark text on light backgrounds

**Border Colors:**
- Default: `#52525b` (zinc-600) - Default borders
- Subtle: `#3f3f46` (zinc-700) - Subtle borders

**State Colors:**
- Success: `#22c55e` (green-500)
- Warning: `#eab308` (yellow-500)
- Error: `#ef4444` (red-500)
- Info: `#3b82f6` (blue-500)

#### Typography Scale

**Font Families:**
- Primary: `'Inter', 'system-ui', 'sans-serif'`
- Monospace: `'Fira Code', 'Monaco', 'Consolas', 'monospace'`

**Font Sizes:**
- Small: `0.875rem` (14px)
- Base: `1rem` (16px)
- Large: `1.125rem` (18px)
- XL: `1.25rem` (20px)
- 2XL: `1.5rem` (24px)
- 3XL: `1.875rem` (30px)
- 4XL: `2.25rem` (36px)

**Line Heights:**
- Tight: `1.25` - For headings
- Normal: `1.5` - For body text
- Relaxed: `1.625` - For long-form content

**Font Weights:**
- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

#### Spacing System

Based on 4px grid:
- 0: `0`
- 1: `0.25rem` (4px)
- 2: `0.5rem` (8px)
- 3: `0.75rem` (12px)
- 4: `1rem` (16px)
- 5: `1.25rem` (20px)
- 6: `1.5rem` (24px)
- 8: `2rem` (32px)
- 12: `3rem` (48px)
- 16: `4rem` (64px)

**Semantic Spacing:**
- Section: `1.5rem` (24px) - Between sections
- Component: `1rem` (16px) - Between components
- Element: `0.5rem` (8px) - Between elements

#### Layout System

**Container Widths:**
- Small: `640px`
- Medium: `768px`
- Large: `1024px`
- XL: `1280px`

**Breakpoints:**
- SM: `640px`
- MD: `768px`
- LG: `1024px`
- XL: `1280px`
- 2XL: `1536px`

**Z-Index Scale:**
- Base: `0`
- Dropdown: `10`
- Sticky: `20`
- Modal: `30`
- Popover: `40`
- Tooltip: `50`

#### Visual Properties

**Border Radius:**
- Small: `0.25rem` (4px)
- Default: `0.5rem` (8px)
- Large: `0.75rem` (12px)
- XL: `1rem` (16px)
- Full: `9999px`

**Shadows:**
- Small: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- Default: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
- Medium: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- Large: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`

**Animations:**
- Duration: `200ms` - Default transition duration
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` - Default easing
- Hover Scale: `1.05` - Subtle scale on hover
- Hover Translate: `-0.25rem` - Lift effect on hover

### Key Architectural Decisions

#### Blog System

- Blog posts are Markdown files in `/src/posts/`
- Dynamic routing via `/src/routes/blog/[slug]/+page.svelte`
- Metadata (title, date, tags, description) in frontmatter
- Automatic reading time calculation
- RSS feed generation at `/rss.xml`

#### Cloudflare Workers Deployment

- Uses `@sveltejs/adapter-cloudflare` for Workers with Static Assets
- Configured via `wrangler.toml` for deployment settings
- Supports full SvelteKit features (vs static adapter limitations)
- Build output in `.svelte-kit/cloudflare/` directory
- **Automatic deployments via Workers Builds (Git integration)**
- Preview deployments for all branches automatically

#### Cloudflare Workers Configuration

- Configured via `wrangler.toml` with Workers-specific settings
- Main worker entry: `.svelte-kit/cloudflare/_worker.js`
- Assets served with ASSETS binding
- **Workers Builds Integration**: Connected to GitHub for automatic deployments
- **Build commands**: `pnpm run build` → `npx wrangler deploy`
- Deployed to `wcygan-net.workers.dev` and custom domain

#### Component Architecture

- Shared components in `/src/lib/components/`
- Business logic in `/src/lib/services/`
- Type definitions in `/src/lib/types.ts`
- Utility functions in `/src/lib/utils/`

### Deployment Workflow

#### Automatic Deployments (Workers Builds)

The project is configured with Cloudflare Workers Builds for automatic Git-based deployments:

- **Production**: Push to `main` branch → Automatic production deployment
- **Preview**: Push to any other branch → Automatic preview deployment with unique URL
- **Pull Requests**: Automatic preview deployments with PR comments showing build status

#### Manual Deployment (Backup Method)

For manual deployments or initial setup:

```bash
pnpm run deploy          # Deploy to production
pnpm run deploy:preview  # Deploy to preview branch
```

#### Local Testing with Workers

Test your site with the Workers runtime locally:

```bash
pnpm run dev:wrangler    # Runs on localhost:8787
```

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

**Accessibility Features:**

- **Colorblind-Safe Palette**: Git flow diagrams use the Okabe-Ito colorblind-safe color palette:
  - Main branch: Emerald (#34d399) - kept for brand consistency
  - Develop branch: Sky blue (#56B4E9)
  - Feature branches: Orange (#E69F00)
  - Additional branches: Bluish-green (#009E73), Yellow (#F0E442)
- **ARIA Support**: All Mermaid diagrams should include:

  - `accTitle`: Accessible title for screen readers
  - `accDescr`: Detailed description of the diagram content
  - Proper ARIA attributes are automatically added by Mermaid
  - SVG elements have `role="img"` for assistive technology

- **High Contrast Text**:
  - Commit labels use light text (zinc-100) on dark backgrounds
  - Branch labels use dark text (zinc-900) on colored backgrounds
  - All text meets WCAG AA contrast requirements

**Accessibility Example:**

```svelte
<MermaidDiagram
  height={350}
  diagram={`gitGraph
    accTitle: Git Flow Branching Model
    accDescr: This diagram shows a typical Git Flow workflow. The main branch represents production code. A develop branch is created for ongoing development. Feature branches are created from develop for new features.
    commit id: "Initial commit"
    branch develop
    checkout develop
    commit id: "Set up development"
    branch feature/new-feature
    checkout feature/new-feature
    commit id: "Add feature"
    checkout develop
    merge feature/new-feature tag: "feature complete"
    checkout main
    merge develop tag: "v1.0.0"`}
/>
```

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
   - **Git commit labels dark on dark background**: Fixed with specific CSS selectors targeting `.commit-label` class
   - **Poor contrast in diagrams**: Use the colorblind-safe palette and ensure all text meets WCAG AA standards
   - **Missing accessibility descriptions**: Always include `accTitle` and `accDescr` in diagram definitions

#### Mermaid Diagram Styling

The application uses a consistent dark theme for all Mermaid diagrams:

**Color Palette:**

- Background: `zinc-900` (#18181b)
- Node fills: `zinc-700` (#3f3f46) - NEVER use emerald fill alone
- Node borders: `emerald-400` (#34d399)
- Text: `zinc-100` (#e4e4e7)
- Edges/Lines: `zinc-500` (#71717a)
- Emphasis: Use `stroke-width:3px` instead of fill color

**Git Flow Specific Styling:**

The project includes custom CSS to ensure proper contrast in git flow diagrams:

- Commit labels use light text (zinc-100) on dark backgrounds
- Branch labels maintain dark text on colored backgrounds
- Increased stroke width (3px) for better visibility
- Base font size increased to 16px for readability

Note: High-specificity CSS selectors are used to override Mermaid's dynamically generated styles. See `src/app.css` for the implementation details.

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

The project includes reusable styling components for creating engaging blog posts with consistent visual design. All patterns follow the established design system tokens and accessibility guidelines.

**Design System Foundation:**

- **Color Palette**: Dark theme with zinc backgrounds and emerald accents
  - Primary: `#34d399` (emerald-400) - Main accent color
  - Background: `#3f3f46` (zinc-700) - Card and component backgrounds
  - Text: `#f4f4f5` (zinc-100) primary, `#d4d4d8` (zinc-300) secondary
- **Spacing**: Based on 4px grid (0.25rem increments)
- **Typography**: Inter font family with consistent scale
- **Animations**: 200ms transitions with cubic-bezier easing

**Available Patterns:**

##### 1. Info Boxes (Key Concept & Key Insight)

Using the InfoBox Component (Recommended):

```svelte
<script>
  import InfoBox from '$lib/components/InfoBox.svelte';
</script>

<!-- Key Concept (Emerald) - for primary takeaways -->
<InfoBox type="concept" title="Key Concept">
  {#snippet children()}
    <p>Your important concept or insight goes here.</p>
  {/snippet}
</InfoBox>

<!-- Key Insight (Zinc) - for secondary information -->
<InfoBox type="insight" title="Key Insight">
  {#snippet children()}
    <p>Your technical insight or note goes here.</p>
  {/snippet}
</InfoBox>
```

Manual HTML (Legacy):

```html
<!-- Key Concept Box (Emerald Accent) -->
<div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4 my-6">
  <h4 class="text-emerald-400 font-semibold mb-2">✨ Key Concept</h4>
  <p class="text-zinc-100">Your important concept or insight goes here.</p>
</div>

<!-- Key Insight Box (Zinc Accent) -->
<div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4 my-6">
  <h4 class="text-zinc-100 font-semibold mb-2">💡 Key Insight</h4>
  <p class="text-zinc-300">Your technical insight or note goes here.</p>
</div>
```

##### 2. Collapsible Sections

Use for progressive disclosure of detailed content:

````html
<details>
<summary><strong>📋 See the Implementation</strong></summary>

```typescript
// Your code here - hidden by default
const example = "This reduces visual clutter";
```

</details>
````

##### 3. Feature Grids

For listing features, benefits, or concepts with icons:

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
  <div class="text-center">
    <div class="text-2xl mb-1">🚀</div>
    <div class="text-sm text-zinc-300">Fast</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">⚡</div>
    <div class="text-sm text-zinc-300">Efficient</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">🔄</div>
    <div class="text-sm text-zinc-300">Reactive</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">🛡️</div>
    <div class="text-sm text-zinc-300">Secure</div>
  </div>
</div>
```

##### 4. Component Description Cards

For explaining multiple related components:

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
  <div class="card-base border border-zinc-700">
    <h4 class="text-emerald-400 font-semibold mb-2">📄 Component Name</h4>
    <p class="text-zinc-300 text-sm">Brief description of what this component does</p>
  </div>
</div>
```

##### 5. Example Conversation/Process Box

For showing step-by-step flows:

```html
<div class="card-base border border-zinc-700 my-6">
  <div class="space-y-3">
    <div><strong class="text-emerald-400">👤 User:</strong> "Question or input"</div>
    <div><strong class="text-zinc-400">🤔 System:</strong> <em>(internal)</em> "Thinking process"</div>
    <div><strong class="text-emerald-400">⚡ Action:</strong> <code>action_taken()</code></div>
    <div><strong class="text-zinc-400">👁️ Result:</strong> <code>&#123;result: "data"&#125;</code></div>
    <div><strong class="text-emerald-400">💬 Response:</strong> "Final answer"</div>
  </div>
</div>
```

##### 6. Two-Column Comparison

For comparing approaches or listing pros/cons:

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">✅ Approach A</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>Benefit 1</li>
      <li>Benefit 2</li>
      <li>Benefit 3</li>
    </ul>
  </div>
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🚀 Approach B</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>Benefit 1</li>
      <li>Benefit 2</li>
      <li>Benefit 3</li>
    </ul>
  </div>
</div>
```

**MDsveX Special Considerations:**

- **Escaping Curly Braces**: Use `&#123;` and `&#125;` in HTML to prevent MDsveX parsing errors
- **Avoid Empty Lines**: Keep component props compact to prevent `</p>` tag injection
- **HTML/Markdown Mixing Rules**:
  - NEVER mix HTML `<li>` with manual bullet points (`•`)
  - Use HTML `<strong>` instead of Markdown `**bold**` inside HTML contexts
  - Example:
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

**Accessibility Requirements:**

- All interactive elements must have visible focus indicators
- Maintain WCAG AA color contrast (4.5:1 minimum)
- Use semantic HTML for proper screen reader support
- Include proper ARIA labels where needed
- Minimum 44x44px touch targets

**Quick Copy CSS Classes:**

- `.card-base` - Standard card styling with zinc-700 background
- `.card-hover` - Adds lift effect on hover
- `.tag-emerald` - Emerald accent tags
- `.tag-zinc` - Zinc secondary tags
- `.section` - Content container with max-width
- `.section-spacing` - Consistent vertical spacing

**Best Practices:**

1. Use semantic HTML elements for better accessibility
2. Apply consistent spacing with `my-6` between major elements
3. Include responsive breakpoints (md:, lg:) for all layouts
4. Use emojis sparingly but consistently as visual markers
5. Follow the established color hierarchy for text and backgrounds
6. Test all patterns with screen readers and keyboard navigation

See `/docs/BLOG_POST_STYLING.md` and `/docs/DESIGN_SYSTEM.md` for complete patterns, templates, and design token reference.

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

#### Comprehensive Puppeteer Testing Workflow

**Frequent Testing Pattern:**

Run Puppeteer tests regularly during development to catch UI regressions early:

```bash
# Start dev server in one terminal
pnpm run dev

# In another terminal, run browser automation tests
# Use the /agent-browser-automation command in Claude Code
```

**Core Testing Scenarios:**

##### 1. Blog Post Rendering Tests

```typescript
// Test full blog post lifecycle
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173/blog'
});

// Verify blog listing loads
await mcp__puppeteer__puppeteer_evaluate({
	script: `document.querySelectorAll('article').length > 0`
});

// Click on first blog post
await mcp__puppeteer__puppeteer_click({
	selector: 'article:first-child a'
});

// Verify post content loaded
await mcp__puppeteer__puppeteer_evaluate({
	script: `document.querySelector('.prose') !== null`
});

// Screenshot the blog post
await mcp__puppeteer__puppeteer_screenshot({
	name: 'blog-post-full',
	width: 1280,
	height: 800
});
```

##### 2. Responsive Design Testing

```typescript
// Test mobile viewport
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173',
	launchOptions: {
		defaultViewport: { width: 375, height: 667 }
	}
});

// Screenshot mobile view
await mcp__puppeteer__puppeteer_screenshot({
	name: 'mobile-homepage',
	width: 375,
	height: 667
});

// Test tablet viewport
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173',
	launchOptions: {
		defaultViewport: { width: 768, height: 1024 }
	}
});

// Verify responsive navigation works
await mcp__puppeteer__puppeteer_evaluate({
	script: `window.innerWidth === 768`
});
```

##### 3. Navigation Flow Testing

```typescript
// Test all main navigation links
const navLinks = ['/', '/blog', '/resume', '/mermaid-examples'];

for (const link of navLinks) {
	await mcp__puppeteer__puppeteer_navigate({
		url: `http://localhost:5173${link}`
	});

	// Verify page loaded without errors
	await mcp__puppeteer__puppeteer_evaluate({
		script: `document.querySelector('main') !== null && !document.querySelector('.error')`
	});

	// Screenshot each page
	await mcp__puppeteer__puppeteer_screenshot({
		name: `page-${link.replace('/', '') || 'home'}`,
		width: 1280,
		height: 800
	});
}
```

##### 4. Performance Testing

```typescript
// Navigate with performance monitoring
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173'
});

// Measure page load metrics
const metrics = await mcp__puppeteer__puppeteer_evaluate({
	script: `
		const perfData = performance.getEntriesByType('navigation')[0];
		({
			domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
			loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
			totalTime: perfData.loadEventEnd - perfData.fetchStart
		})
	`
});
```

##### 5. Interactive Component Testing

```typescript
// Test Mermaid diagram interactions
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173/mermaid-examples'
});

// Scroll to trigger lazy loading
await mcp__puppeteer__puppeteer_evaluate({
	script: `
		const viewports = document.querySelectorAll('.mermaid-viewport');
		viewports.forEach(vp => {
			vp.scrollIntoView();
		});
	`
});

// Wait for diagrams to render
await mcp__puppeteer__puppeteer_evaluate({
	script: `
		new Promise(resolve => setTimeout(resolve, 1000))
	`
});

// Verify all diagrams rendered
const diagramCount = await mcp__puppeteer__puppeteer_evaluate({
	script: `document.querySelectorAll('.mermaid-render-container svg').length`
});
```

##### 6. Error State Testing

```typescript
// Test 404 page
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173/non-existent-page'
});

await mcp__puppeteer__puppeteer_screenshot({
	name: 'error-404',
	width: 1280,
	height: 800
});

// Test error handling in components
await mcp__puppeteer__puppeteer_navigate({
	url: 'http://localhost:5173/mermaid-examples'
});

// Inject invalid Mermaid syntax to test error state
await mcp__puppeteer__puppeteer_evaluate({
	script: `
		const errorContainer = document.querySelector('.mermaid-error');
		errorContainer !== null
	`
});
```

**Testing Best Practices:**

1. **Session Organization**: Create unique session directories for each test run:

   ```bash
   SESSION_ID=$(date +%s%N)
   SCREENSHOT_DIR="/tmp/browser-automation-$SESSION_ID"
   ```

2. **Visual Regression Testing**: Compare screenshots between runs to catch UI changes

3. **Console Error Monitoring**: Always check for JavaScript errors:

   ```typescript
   const errors = await mcp__puppeteer__puppeteer_evaluate({
   	script: `window.__errors__ || []`
   });
   ```

4. **Network Request Validation**: Ensure all resources load successfully

5. **Accessibility Testing**: Verify ARIA labels and keyboard navigation

**Automated Test Suite Integration:**

Create a comprehensive test script that runs all scenarios:

```bash
# In package.json, add:
"test:e2e": "pnpm run dev & sleep 5 && node scripts/run-puppeteer-tests.js"
```

**Common Issues and Solutions:**

- **Timing Issues**: Use explicit waits for dynamic content
- **Selector Changes**: Use data-testid attributes for stable selectors
- **Viewport Variations**: Test multiple viewport sizes
- **Network Delays**: Test with throttled connections
- **Memory Leaks**: Monitor console for warnings

**Development Workflow Integration:**

1. Run Puppeteer tests before committing major UI changes
2. Include screenshot comparisons in pull requests
3. Set up automated testing in CI/CD pipeline
4. Create visual documentation with screenshots
5. Use for debugging production issues locally

### Important Configuration Files

- `svelte.config.js` - SvelteKit and MDsveX configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.ts` - Tailwind customization
- `mdsvex.config.js` - Markdown processing and syntax highlighting
- `wrangler.toml` - Cloudflare Workers deployment configuration
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
