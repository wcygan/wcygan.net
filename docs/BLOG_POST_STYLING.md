# Blog Post Styling Guide

This guide documents reusable styling patterns for creating engaging and readable blog posts with MDsveX and Tailwind CSS.

## Key Principles

1. **Progressive Disclosure**: Use collapsible sections for detailed content
2. **Visual Hierarchy**: Highlight important concepts with colored boxes
3. **Scannability**: Break up content with grids, icons, and visual separators
4. **Dark Theme**: Consistent zinc/emerald color palette

## Component Patterns

### 1. Info Boxes (Key Concept & Key Insight)

#### Using the InfoBox Component (Recommended)

```html
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

<!-- Default behavior (concept type) -->
<InfoBox title="Important Point">
  {#snippet children()}
    <p>Defaults to concept styling if no type is specified.</p>
  {/snippet}
</InfoBox>
```

#### Manual HTML (Legacy)

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

### 2. Collapsible Code Sections

Use for lengthy code examples that would otherwise dominate the visual space.

````html
<details>
<summary><strong>📋 See the Implementation</strong></summary>

```typescript
// Your code here
const example = "This is hidden by default";
````

</details>
```

### 3. Feature Grid (2-4 columns)

Use for listing features, benefits, or related items.

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
  <div class="text-center">
    <div class="text-2xl mb-1">🚀</div>
    <div class="text-sm text-zinc-300">Feature 1</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">⚡</div>
    <div class="text-sm text-zinc-300">Feature 2</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">🔄</div>
    <div class="text-sm text-zinc-300">Feature 3</div>
  </div>
  <div class="text-center">
    <div class="text-2xl mb-1">♻️</div>
    <div class="text-sm text-zinc-300">Feature 4</div>
  </div>
</div>
```

### 5. Component Description Cards

Use for describing multiple related components or concepts.

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">📄 Component Name</h4>
    <p class="text-zinc-300 text-sm">Brief description of what this component does</p>
  </div>
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">⚙️ Another Component</h4>
    <p class="text-zinc-300 text-sm">Description of this component's purpose</p>
  </div>
  <div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🔧 Third Component</h4>
    <p class="text-zinc-300 text-sm">What this component is responsible for</p>
  </div>
</div>
```

### 6. Example Conversation Box

Use for showing step-by-step processes or conversations.

```html
<div class="rounded-lg bg-zinc-700/50 border border-zinc-600 p-4 my-6">
  <div class="space-y-3">
    <div><strong class="text-emerald-400">👤 User:</strong> "Question or input"</div>
    <div><strong class="text-zinc-400">🤔 System:</strong> <em>(internal)</em> "Thinking process"</div>
    <div><strong class="text-emerald-400">⚡ Action:</strong> <code>action_taken()</code></div>
    <div><strong class="text-zinc-400">👁️ Result:</strong> <code>&#123;result: "data"&#125;</code></div>
    <div><strong class="text-emerald-400">💬 Response:</strong> "Final answer"</div>
  </div>
</div>
```

### 7. Section Separators

Use horizontal rules to create clear visual breaks between major sections.

```markdown
---

## Next Section
```

### 8. Two-Column Comparison

Use for comparing features, pros/cons, or different approaches.

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">✅ Approach A</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>• Benefit 1</li>
      <li>• Benefit 2</li>
      <li>• Benefit 3</li>
    </ul>
  </div>
  <div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4">
    <h4 class="text-emerald-400 font-semibold mb-2">🚀 Approach B</h4>
    <ul class="text-zinc-300 space-y-1 text-sm">
      <li>• Benefit 1</li>
      <li>• Benefit 2</li>
      <li>• Benefit 3</li>
    </ul>
  </div>
</div>
```

## Color Palette Reference

### Primary Colors

- **Emerald-400**: `#34d399` - Primary accent, emphasis
- **Emerald-900/20**: Translucent background for primary boxes
- **Emerald-400/30**: Translucent border for primary boxes

### Neutral Colors

- **Zinc-100**: `#e4e4e7` - Primary text on dark backgrounds
- **Zinc-300**: `#a1a1aa` - Secondary text
- **Zinc-400**: `#71717a` - Muted text
- **Zinc-600**: `#52525b` - Borders
- **Zinc-700/50**: Translucent background for secondary boxes
- **Zinc-900**: `#18181b` - Dark backgrounds

## MDsveX Special Considerations

### Escaping Curly Braces

When showing JSON or object syntax in HTML, escape curly braces to prevent MDsveX parsing errors:

```html
<!-- Use HTML entities -->
<code>&#123;key: "value"&#125;</code>

<!-- Instead of -->
<code>{key: "value"}</code>
```

### Avoiding Empty Lines in Components

Keep diagram content compact to prevent MDsveX from injecting `</p>` tags:

```svelte
<!-- ✅ Correct -->
<MermaidDiagram
  height={400}
  diagram={`flowchart TD
    A[Start] --> B[End]`}
/>

<!-- ❌ Wrong - empty lines cause issues -->
<MermaidDiagram
  height={400}
  diagram={`flowchart TD

    A[Start] --> B[End]`}
/>
```

## Best Practices

1. **Use Semantic HTML**: Leverage `<strong>`, `<em>`, `<code>` for proper semantics
2. **Consistent Spacing**: Use `my-6` for vertical spacing between major elements
3. **Responsive Design**: Always include responsive breakpoints (md:, lg:)
4. **Icon Usage**: Use emojis sparingly but consistently for visual markers
5. **Accessibility**: Ensure color contrast meets WCAG standards

## Quick Copy Templates

### Standard Info Box

```html
<div class="rounded-lg bg-emerald-900/20 border border-emerald-400/30 p-4 my-6">
  <h4 class="text-emerald-400 font-semibold mb-2">✨ Title</h4>
  <p class="text-zinc-100">Content here</p>
</div>
```

### Collapsible Section

```html
<details>
<summary><strong>🔍 Click to Expand</strong></summary>

Your hidden content here

</details>
```

### Feature Icons

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
  <div class="text-center">
    <div class="text-2xl mb-1">🎯</div>
    <div class="text-sm text-zinc-300">Label</div>
  </div>
</div>
```

These patterns create visually appealing, scannable content that works well with the site's dark theme while maintaining excellent readability.
