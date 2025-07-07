# Mermaid Components

This directory contains Mermaid diagram components for SvelteKit.

## Components

### MermaidDiagram.svelte

Main component with error handling, caching, and dark theme support.

```svelte
<MermaidDiagram
	height={300}
	diagram={`flowchart TD
    A[Start] --> B[End]`}
/>
```

### MermaidViewport.svelte

Lazy-loads diagrams when they enter the viewport.

```svelte
<MermaidViewport height={300} rootMargin="100px" diagram={`graph LR; A-->B`} />
```

### MermaidFlexible.svelte

Supports both prop and slot-based diagram definitions.

```svelte
<!-- With prop -->
<MermaidFlexible diagram="graph TD; A-->B" />

<!-- With slot -->
<MermaidFlexible>graph TD A --> B</MermaidFlexible>
```

### MermaidLazy.svelte

Code-splits the MermaidDiagram component for better performance.

## Features

- ✅ Client-side rendering with SSR support
- ✅ Automatic caching in sessionStorage
- ✅ Dark theme optimized
- ✅ Comprehensive error handling
- ✅ Viewport-based lazy loading
- ✅ TypeScript support
- ✅ MDsveX compatible

## Usage in Blog Posts

See `/docs/MERMAID_USAGE.md` for comprehensive usage guide.

## Examples

Visit `/mermaid-examples` to see all diagram types in action.
