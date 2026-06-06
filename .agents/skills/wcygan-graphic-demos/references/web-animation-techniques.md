# Web Animation Techniques

Sources:

- web.dev High-performance CSS animations:
  https://web.dev/articles/animations-guide
- MDN Using the Web Animations API:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API

Use this reference when choosing between CSS transitions, CSS animations, and
the Web Animations API for article demo motion.

## Local Decision Rule

Pick the smallest animation primitive that matches the job:

- CSS transition: predictable UI state changes such as hover, active, selected,
  expanded, and data-attribute state.
- CSS animation: predetermined, non-interactive motion such as a fixed entrance
  or an ambient loop.
- Web Animations API: JavaScript needs to start, pause, reverse, retime,
  inspect, or cancel an animation without hand-rolling a `requestAnimationFrame`
  loop.
- `requestAnimationFrame`: the visual state is derived from a model snapshot,
  phase clock, physics step, or canvas renderer.

Do not use WAAPI for model-owned canvas playback. Use it for DOM/SVG element
motion that needs programmatic control.

## Performance Defaults

Use transform and opacity first. web.dev's performance guidance is useful for
this repo because most demo motion is there to explain state, not to exercise
layout.

Prefer:

```css
.demo-chip {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 180ms var(--ease-out-ui),
    transform 180ms var(--ease-out-ui);
}
```

Avoid routine animation of:

- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`
- expensive filters
- large paint-heavy backgrounds

Animating layout can still be appropriate when the layout change is the actual
teaching point, but it needs browser verification.

## CSS Transition Pattern

Use explicit properties and state attributes:

```css
.demo-token {
  opacity: 0.5;
  transform: translateY(0);
  transition:
    opacity 160ms ease,
    transform 180ms var(--ease-out-ui);
}

.demo-token[data-active="true"] {
  opacity: 1;
  transform: translateY(-2px);
}
```

Avoid `transition: all`. It hides the animated surface area and can animate
layout by accident.

Gate hover motion for desktop pointers:

```css
@media (hover: hover) and (pointer: fine) {
  .demo-token:hover {
    transform: translateY(-1px);
  }
}
```

## CSS Animation Pattern

Use CSS animations for predetermined motion, especially decorative entrance
motion:

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
```

Stagger only when it helps the reader parse a group. Keep the content readable
and interactive immediately.

## Web Animations API Pattern

Use WAAPI when the component needs an `Animation` object:

```ts
const animation = element.animate(
  [
    { opacity: 0, transform: "translateY(6px) scale(0.98)" },
    { opacity: 1, transform: "translateY(0) scale(1)" },
  ],
  {
    duration: 180,
    easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    fill: "both",
  },
);

animation.finished.catch(() => {
  // Ignore cancellation during unmount or state replacement.
});
```

WAAPI is useful when you need to:

- cancel an in-flight animation before starting another
- reverse a DOM/SVG animation
- pause or set `currentTime`
- derive timing from `animation.effect.getComputedTiming()`
- coordinate several DOM/SVG elements from one event

Always cancel WAAPI animations during cleanup:

```ts
return () => animation.cancel();
```

## Reduced Motion

Under `prefers-reduced-motion`, remove position and transform motion first. Keep
a short opacity/color transition only when it helps state legibility.

```css
@media (prefers-reduced-motion: reduce) {
  .demo-row {
    animation: none;
    transform: none;
  }

  .demo-token {
    transition: opacity 120ms ease;
  }
}
```

If motion is the only way the demo communicates state, add text, labels, or a
settled representative view.

## Verification

Use browser inspection for animation changes:

- Check for dropped frames when the demo is in motion.
- Verify that routine motion uses transform/opacity unless layout animation is
  intentional.
- Inspect the phone-width layout for label fit and horizontal overflow.
- Slow the animation down temporarily when synchronization matters.

## Review Checklist

- Is the animation purpose named?
- Is CSS transition, CSS animation, WAAPI, or `requestAnimationFrame` the right
  primitive for the job?
- Are transform and opacity the primary animated properties?
- Is `transition: all` absent?
- Are hover effects gated to fine pointers?
- Are WAAPI animations cancelled on cleanup?
- Does reduced motion still show the same invariant?
- Did visual verification cover desktop and phone widths?
