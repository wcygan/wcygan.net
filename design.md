# Design System Guidelines

This document defines the complete design system for wcygan.net, featuring a clean, minimal aesthetic.

## Design Philosophy

**Minimalism First**: Clean, readable design that puts content front and center without visual distractions.

**Accessibility**: WCAG AA compliance with proper contrast ratios, semantic HTML, and screen reader support.

**Performance**: Lightweight styling with system fonts and optimized CSS for fast loading.

**Consistency**: Unified visual language across all pages and components.

## Color System

### Core Palette

All colors follow a consistent design system for perfect visual consistency:

```css
/* Primary Colors */
--color-primary-green: rgb(92, 139, 63);    /* #5c8b3f - Titles, banners, accents */
--color-link-green: rgb(46, 104, 16);       /* #2e6810 - Links, interactive elements */

/* Text Colors */
--color-text-primary: rgb(0, 0, 0);         /* #000000 - Primary text, headings */
--color-text-secondary: rgb(102, 102, 102); /* #666666 - Dates, meta info */
--color-text-nav: rgb(170, 170, 170);       /* #aaaaaa - Navigation links */

/* Background Colors */
--color-bg-primary: rgb(255, 255, 255);     /* #ffffff - Page background */
--color-bg-banner: rgb(92, 139, 63);        /* #5c8b3f - Bio highlight banner */
--color-bg-code: rgb(249, 249, 249);        /* #f9f9f9 - Code blocks */

/* Border Colors */
--color-border-light: rgb(222, 222, 222);   /* #dedede - Table borders, code blocks */
--color-border-accent: rgb(92, 139, 63);    /* #5c8b3f - Header border */
```

### Color Usage Guidelines

**Green (`#5c8b3f`)**: 
- Page titles (blog posts, main headings)
- Bio banner background
- Header border line
- H3 subheadings in content

**Dark Green (`#2e6810`)**:
- All links (underlined)
- Interactive elements

**Black (`#000000`)**:
- Body text
- H1 and H2 headings in content
- Site title

**Gray (`#666666`)**:
- Dates and timestamps
- H2 headings in content (secondary)

**Light Gray (`#aaaaaa`)**:
- Navigation links
- Secondary UI elements

## Typography

### Font System

```css
/* Primary Font Stack (System Fonts) */
font-family: system, -apple-system, "system-ui", "Helvetica Neue", "Lucida Grande", sans-serif;

/* Monospace Font Stack */
font-family: 'Courier New', monospace;
```

### Typography Hierarchy

**Site Title (Header)**:
```css
font-size: 18px;
font-weight: bold;
text-transform: uppercase;
color: rgb(0, 0, 0);
```

**Blog Post Titles**:
```css
font-size: 36px;
font-weight: bold;
color: rgb(92, 139, 63);
line-height: 1;
margin-bottom: 30px;
```

**Navigation**:
```css
font-size: 14px;
text-transform: uppercase;
color: rgb(170, 170, 170);
font-weight: normal;
```

**Body Text**:
```css
font-size: 18px;
line-height: 28px;  /* 1.56 ratio for readability */
color: rgb(0, 0, 0);
```

**Dates/Meta**:
```css
font-size: 18px;
font-style: italic;
color: rgb(102, 102, 102);
```

### Content Hierarchy

**H1 (Content)**:
```css
font-size: 36px;
font-weight: bold;
color: rgb(0, 0, 0);
margin-bottom: 30px;
```

**H2 (Content)**:
```css
font-size: 28px;
font-weight: bold;
color: rgb(102, 102, 102);
margin-bottom: 30px;
```

**H3 (Content)**:
```css
font-size: 24px;
font-weight: bold;
color: rgb(92, 139, 63);
margin-bottom: 30px;
```

## Layout System

### Container Structure

```css
/* Main Container */
.container {
  margin-left: auto;
  margin-right: auto;
  max-width: 800px;  /* Exact match to modern minimal design */
  width: 100%;
}

/* Header */
.site-header {
  margin: 8px 12px 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgb(92, 139, 63);
}

/* Main Content */
.main-section {
  padding: 12px;
}

/* Blog Posts */
.blog-post {
  padding: 12px;
}
```

### Spacing System

**Consistent Spacing**:
- Paragraph margins: `30px` bottom
- Section spacing: `40px` between major sections
- Element spacing: `12px` for padding
- Header margin: `8px 12px 12px`

**Component Spacing**:
```css
/* Post List Items */
.post-item {
  padding: 5px 0;
  margin-bottom: 30px;
}

/* Content Elements */
p, h1, h2, h3, ul, ol, pre, img, table {
  margin-bottom: 30px;
}
```

## Component Guidelines

### Header Component

```html
<header class="site-header">
  <h1 class="site-title">
    <a href="/">Site Name</a>
  </h1>
  <nav class="site-nav">
    <a href="/rss.xml">RSS</a>
    <a href="mailto:email">Email</a>
    <a href="https://github.com/user">GitHub</a>
  </nav>
</header>
```

**Styling Requirements**:
- Green bottom border
- Uppercase site title
- Inline navigation links
- 5px right padding on nav links

### Bio Banner Component

```html
<div class="bio-highlight">
  <p>Brief professional summary with <a href="#">links</a>.</p>
</div>
```

**Styling Requirements**:
- Green background (`rgb(92, 139, 63)`)
- White text
- 20px padding
- White underlined links

### Post List Component

```html
<ul class="post-list">
  <li class="post-item">
    <div class="post-title">
      <a href="/{slug}">Post Title</a>
    </div>
    <div class="post-date">Date</div>
  </li>
</ul>
```

**Styling Requirements**:
- Flex layout with space-between
- Green underlined links
- Gray dates aligned right
- No list bullets

### Blog Post Component

```html
<article class="blog-post">
  <header class="post-header">
    <h1 class="post-title">Post Title</h1>
    <div class="post-meta">
      <time datetime="YYYY-MM-DD">Date</time>
    </div>
  </header>
  <div class="post-content">
    <!-- Content here -->
  </div>
</article>
```

**Styling Requirements**:
- Green post title
- Italic gray date
- Proper content spacing
- Green underlined links throughout

## Interactive Elements

### Links

**Default State**:
```css
color: rgb(92, 139, 63);  /* Content links */
color: rgb(46, 104, 16);  /* Navigation links */
text-decoration: underline;
font-weight: normal;
```

**Hover State**:
```css
text-decoration: underline;  /* Maintain underline */
color: inherit;              /* Keep same color */
```

**Banner Links (Special)**:
```css
color: rgb(255, 255, 255);   /* White on green background */
text-decoration: underline;
font-weight: bold;
```

### Navigation

**Nav Link Styling**:
```css
font-size: 14px;
text-transform: uppercase;
color: rgb(170, 170, 170);
text-decoration: none;
padding: 0 5px 0 0;
display: inline-block;
```

**Nav Link Hover**:
```css
text-decoration: underline;
```

## Content Styling

### Code Blocks

```css
pre {
  padding: 18px 30px;
  background: rgb(249, 249, 249);
  border: 1px solid rgb(222, 222, 222);
  overflow-x: auto;
  margin-bottom: 30px;
}

code {
  font-family: 'Courier New', monospace;
  font-size: 16px;
}
```

### Tables

```css
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

th, td {
  border: 1px solid rgb(222, 222, 222);
  padding: 8px 12px;
  text-align: left;
}

th {
  background: rgb(249, 249, 249);
  font-weight: bold;
}
```

### Lists

```css
ul, ol {
  margin-bottom: 30px;
  padding-left: 20px;
}

li {
  padding: 5px 0;
}
```

### Images

```css
img {
  max-width: 100%;
  height: auto;
  margin-bottom: 30px;
}
```

## Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Mobile Adjustments

```css
@media (max-width: 768px) {
  .container {
    padding: 8px 12px;
  }
  
  .post-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .post-date {
    margin-left: 0;
    margin-top: 4px;
  }
}
```

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards:
- Black text on white: 21:1 ratio
- Green links on white: 4.5:1+ ratio
- White text on green: 4.5:1+ ratio

### Semantic HTML

**Required Elements**:
- `<header>` for site header
- `<main>` for main content
- `<article>` for blog posts
- `<time datetime="">` for dates
- `<nav>` for navigation
- Proper heading hierarchy (h1 → h2 → h3)

### Focus Management

```css
:focus-visible {
  outline: 2px solid rgb(92, 139, 63);
  outline-offset: 2px;
}
```

## Implementation Notes

### CSS Architecture

**File Structure**:
- All styles in `src/app.css`
- Component-specific CSS via CSS classes
- No inline styles except for dynamic content

**CSS Organization**:
1. CSS resets and base styles
2. Typography definitions
3. Layout components
4. Interactive element styles
5. Content-specific styles
6. Responsive media queries

### Route Structure

**Blog Posts**: `/{slug}` (not `/blog/{slug}`)
- Clean URLs matching modern minimal design
- Direct access to posts
- Simplified navigation

### Performance

**Optimization Strategies**:
- System fonts (no web font loading)
- Minimal CSS (< 10KB)
- No JavaScript for styling
- Efficient color palette

## Quality Checklist

### Visual Verification

- [ ] Header matches modern minimal design exactly
- [ ] Green banner styling identical
- [ ] Post list layout and spacing correct
- [ ] Blog post typography matches
- [ ] Link colors and hover states correct
- [ ] Responsive design works on all devices

### Technical Verification

- [ ] All colors use exact RGB values
- [ ] Font families match system stack
- [ ] Spacing uses consistent 30px margins
- [ ] Container width is exactly 800px
- [ ] All components use semantic HTML
- [ ] WCAG AA contrast ratios met

### Functional Verification

- [ ] All links work correctly
- [ ] Navigation functions properly  
- [ ] Blog posts load and display correctly
- [ ] RSS feed generates proper URLs
- [ ] Mobile responsive design works
- [ ] Focus management for accessibility

## Maintenance

### Adding New Components

1. Follow established color palette
2. Use consistent spacing (30px margins)
3. Maintain typography hierarchy
4. Include proper semantic HTML
5. Test on mobile devices
6. Verify accessibility compliance

### Updating Styles

1. Always reference this design system
2. Test against modern minimal design for consistency
3. Maintain backwards compatibility
4. Update documentation if needed
5. Test across all breakpoints

This design system ensures perfect consistency with modern minimal design while maintaining flexibility for future enhancements.