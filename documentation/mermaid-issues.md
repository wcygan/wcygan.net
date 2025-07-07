# Mermaid.js Integration Issues with MDsveX

## Overview

This document describes the challenges encountered when integrating Mermaid.js
diagrams into a SvelteKit blog that uses MDsveX for Markdown processing.

## The Problem

MDsveX was incorrectly parsing Mermaid diagram components in Markdown files,
specifically:

1. **Unwanted HTML Tags**: MDsveX was inserting `</p>` tags within component
   syntax
2. **JavaScript Expression Parsing**: Curly braces `{}` in Mermaid diagrams were
   being interpreted as JavaScript expressions
3. **Compilation Errors**: The parsing issues caused build failures with errors
   like:
   - `Expected token >`
   - `</p> attempted to close an element that was not open`

## Root Cause

MDsveX processes Markdown content before it reaches Svelte, and it was:

- Wrapping inline content in paragraph tags
- Attempting to parse template literal syntax within component props
- Conflicting with the complex syntax of Mermaid diagrams (especially those
  containing curly braces)

## Solutions Attempted

### 1. Direct Component Usage (Failed)

```markdown
<MermaidDiagram height={400}
diagram={`sequenceDiagram
    participant U as User
    ...`} />
```

**Result**: MDsveX added paragraph tags, breaking the component syntax

### 2. Slot-Based Approach (Failed)

```markdown
<MermaidFlexible height={400}>
sequenceDiagram
    participant U as User
    ...
</MermaidFlexible>
```

**Result**: MDsveX still parsed curly braces as JavaScript expressions

### 3. Escaped Content in Slots (Failed)

```markdown
<MermaidFlexible height={400}>
{`sequenceDiagram
    participant U as User
    ...`}
</MermaidFlexible>
```

**Result**: MDsveX wrapped the backticks in paragraph tags

### 4. Working Format from Git History (Success)

The solution that worked in commit `bb13005` used specific formatting:

```markdown
<MermaidDiagram height={400} diagram={`sequenceDiagram participant U as User
participant C as Client App participant A as Auth Server participant R as
Resource Server

    U->>C: Login Request
    ...`}

/>
```

Key differences:

- Participant declarations on a single line (wrapped naturally)
- Blank line before the closing `/>`
- Specific indentation pattern

## Lessons Learned

1. **MDsveX Parsing Behavior**: MDsveX's paragraph wrapping and expression
   parsing can interfere with complex component syntax
2. **Formatting Sensitivity**: The exact formatting of components in Markdown
   can significantly affect parsing
3. **Alternative Approaches**: The James Joy article suggested using slots to
   avoid prop parsing issues, but this didn't work in our case due to MDsveX's
   aggressive parsing

## Recommendations

For future Mermaid.js integrations with MDsveX:

1. **Consider Using Code Blocks**: Instead of inline components, use standard
   Markdown code blocks with a custom transformer
2. **Pre-process Diagrams**: Convert Mermaid syntax to SVG at build time to
   avoid runtime parsing issues
3. **Custom MDsveX Plugin**: Create a rehype/remark plugin to handle Mermaid
   blocks specially
4. **Escape Sequences**: Develop a consistent escaping strategy for special
   characters in component props

## Related Issues

- MDsveX and Prism.js syntax highlighting conflicts (as noted in James Joy's
  article)
- Component prop parsing with complex string content
- Whitespace sensitivity in MDsveX processing

## Implemented Solution (January 2025)

### What Was Fixed

The core issue was successfully resolved by implementing the exact formatting pattern that worked in commit `bb13005`. Here's what was done:

#### 1. **Restored Working Formatting in `src/posts/mermaid-diagrams.md`**

The sequence diagram was reformatted to use the exact pattern that avoids MDsveX parsing conflicts:

```markdown
<MermaidDiagram height={400} diagram={`sequenceDiagram participant U as User
participant C as Client App participant A as Auth Server participant R as
Resource Server

    U->>C: Login Request
    ...`}

/>
```

**Key formatting elements:**

- Participant declarations on single line with natural wrapping
- Blank line before the closing `/>`
- No manual line breaks within the template literal

#### 2. **Fixed Svelte 5 Compatibility Issues**

Updated `src/lib/components/MermaidFlexible.svelte` to handle Svelte 5's new requirement:

```svelte
<div style="display: none" contenteditable="true" bind:textContent={slotContent}>
```

The `contenteditable="true"` attribute is now required for `textContent` bindings in Svelte 5.

#### 3. **Resolved TypeScript Linting Errors**

- **MermaidDiagram.svelte**: Fixed type annotation instead of using `any`:

  ```typescript
  console.log(
  	'[MermaidDiagram] Mermaid version:',
  	(mermaid as { version?: string }).version || 'unknown'
  );
  ```

- **MermaidLazy.svelte**: Added proper type annotation for dynamic import:

  ```typescript
  let MermaidComponent: typeof import('./MermaidDiagram.svelte').default | null = null;
  ```

- **MermaidViewport.svelte**: Removed unused `isIntersecting` variable

- **mermaid-cache.ts**: Removed unused error variable by using bare catch clause

#### 4. **Root Cause Analysis**

The issue was caused by MDsveX's processing pipeline:

1. **MDsveX processes Markdown before Svelte compilation**
2. **Paragraph wrapping**: MDsveX automatically wraps content in `<p>` tags
3. **Expression parsing**: Curly braces `{}` are interpreted as JavaScript expressions
4. **Line breaking sensitivity**: Manual line breaks within template literals trigger unwanted parsing

The working solution avoids these issues by:

- Using natural line wrapping instead of manual breaks
- Keeping participant declarations compact
- Adding strategic blank lines to separate content

#### 5. **Verification**

All components are now working correctly:

- ✅ Flowchart diagrams render properly
- ✅ Sequence diagrams render with complex participant lists
- ✅ State diagrams work as expected
- ✅ Error handling displays helpful debug information
- ✅ Caching system improves performance
- ✅ Dark theme styling applied correctly

### Performance Improvements

The solution also includes several performance enhancements:

- **SessionStorage caching** of rendered SVG diagrams
- **Viewport loading** with `MermaidViewport` component for below-fold diagrams
- **Dynamic imports** to reduce initial bundle size
- **Error boundaries** with detailed debugging information

## Critical SSR/Hydration Issue (Resolved)

### The Hidden Problem

After implementing the MDsveX formatting fixes above, a more critical issue was discovered: **Complete SSR/hydration failure when accessing blog posts directly via URL** (vs. client-side navigation).

**Symptoms**:

- ❌ Navbar component failed to render
- ❌ All Mermaid diagrams stuck on "Loading diagram..."
- ❌ Console error: `TypeError: Failed to resolve module specifier 'mermaid'`
- ✅ Everything worked perfectly when navigating from home page

### Root Cause: Vite Module Resolution

The actual root cause was a **misconfigured Vite alias** that prevented the Mermaid module from loading during hydration:

```typescript
// vite.config.ts - BROKEN
resolve: {
	alias: {
		mermaid: 'mermaid/dist/mermaid.esm.mjs'; // This file doesn't exist!
	}
}
```

The alias pointed to `mermaid.esm.mjs` but the actual file was `mermaid.esm.min.mjs`.

### The Permanent Fix

**Simple one-line change in `vite.config.ts`**:

```typescript
// vite.config.ts - FIXED
resolve: {
	alias: {
		mermaid: 'mermaid/dist/mermaid.esm.min.mjs'; // Correct file path
	}
}
```

### Why This Fixes Everything

1. **Module Resolution**: Vite can now properly resolve the Mermaid import during SSR/hydration
2. **JavaScript Execution**: Client-side JavaScript executes correctly, allowing components to mount
3. **Cascading Fix**: Once JavaScript works, both navbar and Mermaid components render properly

### Verification Results

**Direct URL Access** (`http://localhost:5173/blog/mermaid-diagrams`):

- ✅ Navbar renders correctly
- ✅ All 5 Mermaid diagrams render
- ✅ No console errors
- ✅ Proper hydration of all components

**Client-Side Navigation**:

- ✅ Still works perfectly (was never broken)

**Production Build**:

- ✅ Builds successfully
- ✅ All chunks generated properly

### Key Lessons

1. **SSR/Hydration failures can cascade**: One module resolution error can break all client-side JavaScript
2. **Check infrastructure first**: Before modifying components, verify module resolution and build configuration
3. **Different access patterns reveal different issues**: Always test both direct URL access AND client-side navigation
4. **Simple fixes are often best**: A one-line config change solved what appeared to be complex component issues

## Best Practices Going Forward

For future Mermaid.js integrations with MDsveX, follow the guidelines documented
in `CLAUDE.md` under "Important: Avoiding MDsveX Parsing Issues". Key points:

1. **Always use the correct formatting pattern** with props on separate lines
2. **Verify Vite module aliases** point to the correct file paths
3. **Test both direct URL access AND client-side navigation**
4. **Use onMount for browser-only code** instead of `$app/environment`

## References

- [James Joy's Mermaid + Svelte Article](https://jamesjoy.site/posts/2023-06-26-svelte-mermaidjs)
- Git commits:
  - `c9aa8af` (broken - MDsveX parsing issues)
  - `bb13005` (working MDsveX pattern)
  - `bd8ecc7` (attempted SSR fix with browser detection)
  - `4a5f6da` (final fix - Vite module resolution)
  - `5845327` (final MDsveX formatting fix)
- MDsveX documentation on component usage in Markdown
- Vite configuration documentation for module aliases
- Project CLAUDE.md for best practices and formatting guidelines
