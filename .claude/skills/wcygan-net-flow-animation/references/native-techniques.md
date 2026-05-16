# Native Techniques

Use native browser techniques first for wcygan.net flow demos. They match the
site's no-component-library posture, keep MDX demos easy to review, and avoid
shipping an animation runtime for simple state changes.

Sources checked: 2026-05-16.

## Technique Choice

| Technique                    | Use for                                                                                                                    | Avoid when                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| CSS transitions              | Step state changes from `data-*` attributes, hover/active feedback, progress rail movement, opacity reveals.               | The timeline needs imperative pause/seek/reverse logic beyond React state.                |
| CSS keyframes                | Subtle looping attention cues such as a packet pulse or retry pulse.                                                       | The animation is long-running decoration or cannot be disabled cleanly.                   |
| Web Animations API           | Imperative playback control, reversing, playback-rate changes, or coordinating browser-managed animations from React refs. | A CSS transition on state attributes is enough.                                           |
| CSS scroll-driven animations | Optional scrollytelling where scroll position should scrub progress directly.                                              | A demo needs Step/Reset controls, deterministic active state, or broad fallback behavior. |
| View Transition API          | Page/view swaps or large DOM-state transitions.                                                                            | A local step marker or panel reveal is the only thing moving.                             |

## CSS Transitions

Default to CSS transitions for stateful blog demos:

```tsx
<li data-state={state}>
  <span className="flow-marker">{formatStep(index)}</span>
  <span className="flow-copy">{stage.label}</span>
</li>
```

```css
.flow-marker {
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 180ms var(--flow-ease-out);
}

[data-state="active"] .flow-marker {
  transform: scale(1.05);
}
```

This is the CDC/DLQ pattern: React owns the state, CSS owns the interpolation.
MDN's transitions guide documents that `transition` is the shorthand for
coordinating transition property, duration, timing, delay, and behavior, and
that transitions smooth JavaScript-applied style changes.

## CSS Keyframes

Use keyframes for small repeated cues only:

```css
@keyframes flow-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 5px rgba(70, 110, 170, 0.12);
  }
  50% {
    box-shadow: 0 0 0 9px rgba(70, 110, 170, 0);
  }
}
```

Keep keyframes local to the component's class prefix and always add a matching
`prefers-reduced-motion` override. MDN notes that CSS animations use a style
plus keyframes and let the browser manage the animation sequence.

## Web Animations API

Use the Web Animations API only when a demo needs imperative timeline control:

```tsx
const animation = element.animate(keyframes, options);
animation.pause();
animation.currentTime = 0;
animation.playbackRate = prefersReducedMotion ? 0 : 1;
```

Good fits:

- replaying a packet path independently from the current step
- scrubbing a demo from an external slider
- pausing, reversing, or changing speed without encoding many CSS classes

Poor fits:

- ordinary Play/Step/Reset state machines
- any implementation that would require DOM querying where React state is enough

MDN describes the API as JavaScript access to the browser animation engine and
points to `Document.getAnimations()` for whole-page playback-rate adjustments.

## Scroll-Driven Animations

CSS scroll-driven animations can bind keyframe progress to scroll progress or
view progress via `animation-timeline`, `scroll()`, or `view()`. Use this for
article scrollytelling where the reader's scroll position is the control.

Do not replace explicit Step/Reset demos with scroll timelines. The site pattern
is intentionally deterministic: every stage has a readable active state, a
button, and a reset path.

## View Transitions

The View Transition API is useful for route-level or large DOM-state
transitions. For this skill, it is usually a research note, not a default
implementation. It can make sense if a future post demo swaps entire diagrams or
views and the browser can handle the transition between old and new DOM
snapshots.

## Sources

- MDN:
  [Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using)
- MDN:
  [Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using)
- MDN:
  [Using the Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API)
- MDN:
  [Scroll-driven animation timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines)
- MDN:
  [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
