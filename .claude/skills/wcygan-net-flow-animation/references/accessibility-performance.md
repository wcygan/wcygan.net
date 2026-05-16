# Accessibility And Performance

Flow animations are explanatory controls, not decoration. Preserve reader
control, avoid motion surprises, and keep animation work cheap enough for a blog
post.

Sources checked: 2026-05-16.

## Autoplay Rules

For any automatically advancing demo:

- Provide a visible control that stops and restarts playback.
- Put that control before the animated content in the tab order when feasible.
- Stop autoplay when the user manually steps, resets, or jumps to a stage.
- Consider stopping autoplay on focus or hover for carousel-like experiences.
- Do not restart autoplay unless the reader explicitly asks.

WCAG 2.2 Success Criterion 2.2.2 requires a pause, stop, hide, or frequency
control for moving, blinking, scrolling, or auto-updating information that
starts automatically and lasts more than five seconds. The WAI-ARIA carousel
pattern is a useful analogue for our flow demos because it treats auto-rotation
as something users must be able to control.

## Reduced Motion

Handle reduced motion in React and CSS:

```tsx
useEffect(() => {
  if (prefersReducedMotion) {
    setIsPlaying(false);
    setActiveStep(LAST_STEP);
  }
}, [prefersReducedMotion]);
```

```css
@media (prefers-reduced-motion: reduce) {
  .flow-demo *,
  .flow-demo::before,
  .flow-demo::after {
    animation: none;
    transition-duration: 0.01ms;
  }
}
```

Pick the reduced-motion state intentionally:

- Use the final state when the demo's purpose is "show the eventual outcome."
- Use the first state when the demo's purpose is "orient before interaction."
- Keep `Step` and `Reset` available even when autoplay is disabled.

## React Effects

Intervals and external animations are effects. They must clean up:

```tsx
useEffect(() => {
  if (!isPlaying || prefersReducedMotion) return;

  const intervalId = window.setInterval(() => {
    setActiveStep((step) => nextStep(step));
  }, STEP_MS);

  return () => window.clearInterval(intervalId);
}, [isPlaying, prefersReducedMotion]);
```

Use updater functions such as `setActiveStep((step) => nextStep(step))` so the
effect does not depend on `activeStep` and recreate the interval on every tick.
React's `useEffect` docs call out cleanup before changed dependencies and after
unmount, and the interval example recommends updater functions to avoid
unnecessary interval reset.

## Performance Rules

- Prefer `transform` and `opacity` for frequently animated properties.
- Keep layout-changing animation (`width`, `height`, `left`, `top`, grid track
  changes) rare and bounded to small elements.
- Avoid animating expensive paint effects across large areas.
- Use `will-change` only as a last resort for measured issues; do not leave it
  permanently on many elements.
- Keep all decorative pulses short, subtle, and disabled by reduced motion.
- Verify with screenshots and browser interaction before trusting type checks.

MDN warns that animation cost varies by property and can cause jank. web.dev's
performance guide recommends checking whether a property affects the rendering
pipeline and restricting animation to `transform` and `opacity` where possible.
MDN's `will-change` documentation says to use it sparingly and preferably switch
it on and off around the actual change.

## Sources

- W3C WAI:
  [Understanding SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- W3C WAI-ARIA APG:
  [Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- React: [`useEffect` reference](https://react.dev/reference/react/useEffect)
- MDN:
  [Animation performance and frame rate](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- MDN:
  [`will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)
- web.dev:
  [How to create high-performance CSS animations](https://web.dev/articles/animations-guide)
