# Mermaid Diagram Usage Guide

This guide explains how to use Mermaid diagrams in your SvelteKit blog posts and
pages.

## Quick Start

In your MDsveX files (`.md` posts), import and use the MermaidDiagram component:

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

## Available Components

### 1. MermaidDiagram (Main Component)

The primary component with built-in error handling, caching, and dark theme
support.

**Props:**

- `diagram` (string, required): The Mermaid diagram syntax
- `height` (number, default: 400): Minimum height in pixels

**Features:**

- Automatic caching of rendered diagrams
- Comprehensive error handling with helpful messages
- Dark theme optimized styling
- Debug information in development mode

### 2. MermaidViewport (Lazy Loading)

Renders diagrams only when they enter the viewport, improving initial page load.

```svelte
<script>
	import MermaidViewport from '$lib/components/MermaidViewport.svelte';
</script>

<MermaidViewport
	height={300}
	rootMargin="100px"
	diagram={`graph LR
    A[Lazy] --> B[Loading]`}
/>
```

**Props:**

- All MermaidDiagram props
- `rootMargin` (string, default: "100px"): Start loading before entering
  viewport

### 3. MermaidFlexible (Advanced)

Supports both prop-based and slot-based diagram definitions with optional lazy
loading.

```svelte
<script>
	import MermaidFlexible from '$lib/components/MermaidFlexible.svelte';
</script>

<!-- Using prop -->
<MermaidFlexible diagram="graph TD; A-->B" />

<!-- Using slot -->
<MermaidFlexible>graph TD A[Using] --> B[Slot]</MermaidFlexible>

<!-- With viewport loading -->
<MermaidFlexible viewport>sequenceDiagram A->>B: Message</MermaidFlexible>
```

## Supported Diagram Types

All Mermaid diagram types are supported:

### Flow Chart

```
flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]
```

### Sequence Diagram

```
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hi Alice!
```

### State Diagram

```
stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
```

### Entity Relationship

```
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
```

### Gantt Chart

```
gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1, 20d
```

### Git Graph

```
gitGraph
    commit
    branch develop
    checkout develop
    commit
    checkout main
    merge develop
```

## Performance Tips

1. **Use Caching**: Diagrams are automatically cached in sessionStorage
2. **Viewport Loading**: For pages with many diagrams, use MermaidViewport
3. **Lazy Components**: Use MermaidFlexible with `lazy` prop for code splitting

## Styling

The components automatically apply dark theme styling. To customize:

```css
/* In your global styles */
:global(.mermaid-render-container text) {
	fill: #your-color !important;
}

:global(.mermaid-render-container .node rect) {
	fill: #your-bg-color !important;
	stroke: #your-border-color !important;
}
```

## Troubleshooting

### Diagrams Not Rendering

1. Check browser console for errors
2. Verify diagram syntax at [Mermaid Live Editor](https://mermaid.live)
3. Ensure you're using template literals for multi-line diagrams

### Performance Issues

1. Enable viewport loading for below-fold diagrams
2. Use the caching system (enabled by default)
3. Consider static generation for SEO-critical diagrams

### Styling Issues

1. The components include comprehensive dark theme styles
2. Use `!important` in custom styles to override defaults
3. Check that text color contrasts with background

## Example Blog Post

```markdown
---
title: System Architecture
date: 2025-01-25
---

<script>
  import MermaidDiagram from '$lib/components/MermaidDiagram.svelte'
  import MermaidViewport from '$lib/components/MermaidViewport.svelte'
</script>

# System Architecture

Here's our microservices architecture:

<MermaidDiagram height={400} diagram={`flowchart TB subgraph "Frontend" A[Web
App] B[Mobile App] end

    subgraph "Backend"
      C[API Gateway]
      D[Auth Service]
      E[User Service]
      F[Order Service]
    end

    subgraph "Data"
      G[(PostgreSQL)]
      H[(Redis)]
    end

    A --> C
    B --> C
    C --> D
    C --> E
    C --> F
    D --> G
    E --> G
    F --> G
    D --> H
    E --> H`}

/>

## Sequence Flow

Below the fold, this diagram loads when scrolled into view:

<MermaidViewport height={300} diagram={`sequenceDiagram participant U as User
participant F as Frontend participant A as API participant D as Database

    U->>F: Click button
    F->>A: POST /api/action
    A->>D: Query data
    D->>A: Return results
    A->>F: JSON response
    F->>U: Update UI`}

/>
```

## Advanced: Build-Time Rendering

For SEO-critical diagrams, consider using a remark plugin during build:

```bash
npm install remark-mermaidjs playwright
```

This requires additional setup but generates static SVGs at build time.
