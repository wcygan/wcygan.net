# UI Motion Polish For wcygan.net Graphic Demos

Source skill:
`/Users/wcygan/Development/dotfiles/config/codex/skills/ui-motion-polish/SKILL.md`

Use this reference when a graphic demo includes motion, animated state changes,
interactive controls, hover or press states, drag/swipe gestures, reduced-motion
behavior, or a request to make a demo feel more polished.

## Demo Motion Contract

Do not implement vague requests like "make it smoother" directly. Translate them
first:

- Purpose: orientation, feedback, continuity, confirmation, reveal, explanation,
  or perceived performance.
- Pattern: fade, slide, scale, pop, reveal, crossfade, continuity transition,
  layout animation, direction-aware transition, press feedback, drag, swipe,
  hold to confirm, number ticker, shimmer, line drawing, packet flow, or idle
  animation.
- Timing: duration, delay, stagger, keyframes, fill mode, interruptibility, loop
  behavior, or scroll linkage.
- Easing or physics: ease-out, ease-in-out, linear, cubic-bezier token, spring
  stiffness, damping, mass, velocity, momentum, or bounce.
- Spatial rule: transform origin, movement direction, path anchor, geometry
  source, pointer capture, cancellation rule, focus behavior, or keyboard
  behavior.
- Constraints: prefer transform and opacity, avoid `transition: all`, avoid
  layout thrash, respect `prefers-reduced-motion`, and verify desktop plus
  phone-width rendering.

## Motion Decisions

- Decide whether motion should exist before tuning it. Remove or reduce
  animation for high-frequency controls, keyboard-driven flows, dense work
  surfaces, or anything that blocks repeated reading.
- Every animation needs a reason: spatial continuity, state feedback,
  explanation, confirmation, or making an abrupt state change legible.
- Routine UI motion should stay under 300ms. Use 100-160ms for press feedback,
  125-200ms for tooltips or compact popovers, 150-250ms for menus/selects, and
  200-500ms only for larger surfaces such as drawers or dialogs.
- Use easing that responds immediately. Prefer ease-out for enters/exits and
  feedback, ease-in-out for visible state-to-state movement, ease for subtle
  color/hover changes, and linear for constant packet/progress motion.
- Avoid ease-in for normal UI feedback because the slow start makes the
  interface feel late.
- Keep motion cohesive with the article: crisp and explanatory for technical
  demos, more expressive only when it clarifies the concept.

Useful local defaults when a demo needs explicit CSS tokens:

```css
--ease-out-ui: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out-ui: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer-ui: cubic-bezier(0.32, 0.72, 0, 1);
```

## Component Rules

- Add subtle press feedback to clickable controls when it fits the component:
  `transform: scale(0.97)` with a short transform transition.
- Specify transition properties directly. Do not use `transition: all`.
- Animate transform and opacity by default. Avoid animating layout properties
  unless the layout change itself is the teaching point and performance has been
  checked.
- Do not enter from `scale(0)`. Start around `scale(0.95)` with opacity for
  visual continuity.
- Make anchored overlays origin-aware when a library exposes a transform-origin
  variable. Keep centered dialogs centered.
- Gate hover-only motion behind `@media (hover: hover) and (pointer: fine)` so
  touch devices do not get stuck in hover-like states.
- Use short stagger delays, around 30-80ms, only for decorative group entry.
  Never block reading or interaction until staggered items finish.
- Prefer percentage translates for offscreen entry/exit when movement should be
  relative to the element's own size.
- Use tabular numbers for counters and number tickers so values do not shift
  layout.

## Demo-Specific Patterns

### Pressable Controls

```css
.demo-action {
  transition:
    transform 140ms var(--ease-out-ui),
    background-color 140ms ease;
}

.demo-action:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .demo-action:hover {
    transform: translateY(-1px);
  }

  .demo-action:hover:active {
    transform: scale(0.97);
  }
}
```

### State Swap Crossfades

Use blur sparingly when two labels, icons, or values briefly overlap during a
state swap. Keep it small and remove it under reduced motion if it smears the
state.

```css
.demo-label {
  transition:
    opacity 180ms ease,
    filter 180ms ease;
}

.demo-label[data-swapping="true"] {
  opacity: 0.7;
  filter: blur(1.5px);
}
```

### Staggered Entry

Use short stagger only for decorative entry. The demo should be readable and
interactive immediately.

```css
.demo-row {
  animation: demo-row-enter 220ms var(--ease-out-ui) both;
  animation-delay: calc(var(--row-index) * 45ms);
}

@keyframes demo-row-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo-row {
    animation: none;
  }
}
```

### Drag Or Swipe

- Use pointer capture once dragging starts so the interaction continues outside
  the original element bounds.
- Protect active drags from extra touch points.
- Use velocity as well as distance for dismissal or commitment.
- Apply damping or friction beyond natural boundaries instead of hard stops.
- Update the dragged element directly during per-frame motion:

```ts
node.style.transform = `translate3d(0, ${offsetPx}px, 0)`;
```

Avoid inherited CSS variables on large subtrees for values that update every
frame.

## Performance And Accessibility

- Respect `prefers-reduced-motion`. Reduce position and transform motion first;
  keep brief opacity or color transitions only when they aid comprehension.
- Prefer CSS transitions for predictable state changes and CSS animations for
  predetermined non-interactive motion.
- Use springs only for gesture-driven or interruptible motion. Keep bounce
  subtle unless the demo is intentionally playful.
- Use WAAPI when JavaScript needs browser-native animation control.
- Keep blur small and rare. Heavy filters are expensive, especially in Safari.
- Verify motion visually at normal speed and, when the timing is subtle, slow it
  down temporarily to inspect origin, synchronization, label fit, and state
  legibility.

## Review Checklist

- Is the invariant visible in the first frame?
- Does each animation have a named purpose?
- Is the motion contract explicit enough to implement?
- Is routine UI motion under 300ms?
- Are `transition: all`, ease-in UI feedback, and layout animation avoided?
- Are hover effects gated for fine pointers?
- Are pressable controls responsive?
- Are reduced-motion users given a useful static or gentler state?
- Are canvas packets, connectors, labels, and progress bars synchronized to the
  same model geometry?
- Does desktop and phone-width rendering stay readable with no horizontal
  overflow?
