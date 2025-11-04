# CLAUDE.md

Modern UI/UX Engineering guide for wcygan.net - a SvelteKit blog with clean, accessible design.

## Essential Commands

```bash
# Development
pnpm run dev          # Start development server
pnpm run preview      # Preview production build
pnpm run dev:wrangler # Test with Cloudflare Workers

# Quality & Testing
pnpm run pre-commit   # Format + lint + typecheck (recommended before commits)
pnpm run test         # Run Vitest unit tests
deno task fix-mermaid # Fix Mermaid diagram formatting

# Deployment
git push origin main  # Auto-deploy to production via Cloudflare Workers
pnpm run build        # Manual build for Cloudflare Workers

# Content
pnpm run post         # Create new blog post interactively
```

## 5-Step UI/UX Design Framework

### Technology Stack

- **SvelteKit 2.15+** with Cloudflare Workers deployment
- **Svelte 5** with runes for reactive state management
- **Tailwind CSS** with Typography plugin for consistent styling
- **MDsveX** for Markdown blog posts with syntax highlighting
- **TypeScript** with strict mode for type safety

### Step 1: Structure & Spacing (The Skeleton)

**8pt Grid System**: All spacing uses multiples of 8px (`p-4`, `gap-6`, `mb-8`)

```css
/* Layout Container */
max-width: 800px;        /* Main content width */
margin-bottom: 30px;     /* Standard element spacing */
```

**Responsive Design**: Mobile-first with Tailwind breakpoints

- Base: Mobile (< 640px)
- `sm:`: Small tablets (≥ 640px)
- `md:`: Tablets (≥ 768px)
- `lg:`: Desktop (≥ 1024px)

### Step 2: Typography & Color (The Visual Style)

**Color Palette** (Light theme):

```css
--color-primary-green: rgb(92, 139, 63);    /* Titles, banners, accents */
--color-link-green: rgb(46, 104, 16);       /* Interactive links */
--color-text-primary: rgb(0, 0, 0);         /* Body text */
--color-text-secondary: rgb(102, 102, 102); /* Dates, metadata */
```

**Typography Hierarchy**:

```css
/* System font stack for performance */
font-family: system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif;

/* Sizes */
font-size: 18px;         /* Base body text */
line-height: 28px;       /* Optimal readability */
```

### Step 3: Design Components (The Building Blocks)

**Component Architecture**:

- `/src/lib/components/` - Reusable UI components
- `/src/routes/` - Page routes and layouts
- `/src/posts/` - Markdown blog content

**Blog System**:

- Clean URLs: `/{slug}` (no `/blog` prefix)
- Frontmatter metadata: title, date, tags, description
- Automatic reading time calculation

### Step 4: Implement User States (The Interactivity)

**Required States for Interactive Elements**:

- `hover:` - Subtle feedback (`hover:shadow-md`, color changes)
- `focus-visible:` - **Mandatory** keyboard accessibility rings
- `active:` - Visual feedback for pressed states
- `disabled:` - Clear indication (`opacity-50`, `cursor-not-allowed`)
- Loading states with skeleton loaders
- Empty states with helpful messages
- Error states with clear messaging

### Step 5: Accessibility by Default (The Foundation)

**Non-negotiable Requirements**:

- Semantic HTML5 tags (`<main>`, `<nav>`, `<article>`, `<button>`)
- WCAG AA contrast ratios (4.5:1 minimum)
- Keyboard navigation for all functionality
- Screen reader support with proper ARIA labels
- Image alt text and meaningful link text

## Development Best Practices

### Do's and Don'ts

| ✅ **Do**                                                | ❌ **Don't**                              |
| -------------------------------------------------------- | ----------------------------------------- |
| Use Tailwind design tokens (`text-primary-green`)        | Hard-code hex values (`#34D399`)          |
| Space everything in 8px multiples (`p-4`, `gap-6`)       | Use arbitrary values (`margin-top: 13px`) |
| Implement all interaction states (hover, focus, loading) | Style only the default "happy path"       |
| Ensure visible focus rings (`focus-visible:ring-2`)      | Disable browser focus styles              |
| Use semantic HTML (`<button>`, `<nav>`, `<main>`)        | Build interactive elements from `<div>`s  |
| Follow the light theme design system                     | Mix inconsistent color schemes            |

### Component Patterns

**Standard Card Structure**:

```svelte
<article class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
  <header class="mb-4">
    <h2 class="text-xl font-medium text-black">Card Title</h2>
    <time class="text-sm text-gray-600">Publication Date</time>
  </header>

  <p class="text-gray-800 leading-relaxed mb-4">
    Card description content with proper line height.
  </p>

  <div class="flex flex-wrap gap-2">
    <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
      Technology Tag
    </span>
  </div>
</article>
```

**Mermaid Diagram Usage**:

```svelte
<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte';
</script>

<MermaidDiagram
  height={400}
  diagram={`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Try Again]`}
/>
```

### Content Creation

**Blog Posts**:

1. Run `pnpm run post` for interactive creation
2. Posts automatically appear in RSS feed at `/rss.xml`
3. Use frontmatter: `title`, `date`, `tags`, `description`, `published`

**Adding Diagrams**:

- Use `deno task fix-mermaid` to prevent MDsveX parsing issues
- Include `accTitle` and `accDescr` for accessibility
- Prefer `MermaidViewport` for below-the-fold diagrams

### Testing & Quality

**Essential Testing**:

```bash
pnpm run pre-commit    # Run before every commit
pnpm run test         # Unit tests with Vitest
```

**Browser Testing**: Use Puppeteer MCP for end-to-end testing of UI interactions and responsive design.

### Key Configuration

- `design.md` - Complete design system specification
- `src/app.css` - Global styles and design tokens
- `svelte.config.js` - SvelteKit + MDsveX configuration
- `tailwind.config.ts` - Custom design system integration
- `wrangler.toml` - Cloudflare Workers deployment
