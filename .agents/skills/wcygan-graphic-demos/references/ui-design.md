# UI Design Polish For wcygan.net Graphic Demos

Source skill:
`/Users/wcygan/Development/dotfiles/config/codex/skills/ui-design/SKILL.md`

Use this reference when reviewing or polishing the visual and interaction
quality of article-native demos. The goal is not decoration. The goal is a demo
whose small details make the teaching point easier to understand.

## Core Principles

- Taste is trained through comparison. Before inventing a new demo style, look
  at strong local examples and identify why their hierarchy, rhythm, motion, and
  controls work.
- Unseen details compound. Alignment, transform origin, timing, hover behavior,
  reduced-motion states, and label fit all matter even when readers do not name
  them.
- Beauty is leverage only when it serves the concept. In a technical article,
  polish should make state, causality, and failure modes easier to inspect.

For this repo, "good taste" usually means:

- One invariant is visible without reading a legend twice.
- Motion explains causality instead of merely adding activity.
- Labels fit on mobile and stay aligned with the things they name.
- Controls feel immediate and do not shift the layout.
- The color vocabulary matches the site and the article family.
- The final state is worth inspecting when animation is disabled.

## Animation Decision Framework

Answer these before adding or changing animation:

1. Should this animate at all?
   - High-frequency or keyboard-triggered action: do not animate.
   - Repeated reading/navigation controls: remove or drastically reduce motion.
   - Occasional UI surfaces: use standard, fast motion.
   - Rare explanatory moments: modest delight is acceptable if it teaches.
2. What is the purpose?
   - Spatial consistency, state indication, explanation, feedback, or preventing
     a jarring change.
   - If the only reason is "it looks cool," do not add it to a repeated demo
     interaction.
3. What easing should it use?
   - Entering/exiting or immediate feedback: ease-out.
   - Moving between visible states: ease-in-out.
   - Hover or color change: ease.
   - Constant loops or progress: linear.
   - Avoid ease-in for UI feedback.
4. How fast should it be?
   - Button press feedback: 100-160ms.
   - Tooltips and small popovers: 125-200ms.
   - Dropdowns and selects: 150-250ms.
   - Larger drawers/dialogs: 200-500ms.
   - Routine UI should stay under 300ms.

Useful curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

## Component Building Rules

- Buttons and pressable controls should feel responsive. Add subtle active
  scale, usually `scale(0.97)`, when it fits the demo style.
- Do not animate from `scale(0)`. Start around `scale(0.95)` with opacity so
  entry has visual continuity.
- Popovers, menus, and tooltips should scale from their trigger when anchored.
  Centered dialogs stay centered.
- Use CSS transitions over keyframes for dynamic UI that users can trigger
  repeatedly, because transitions retarget cleanly.
- Use `@starting-style` for CSS entry transitions when browser support allows.
  Otherwise use the existing mounted/data-attribute pattern.
- Use percentage translates for offscreen entry/exit when movement should track
  the element's own size.
- Use `clip-path: inset(...)` for reveals, hold-to-confirm overlays, comparison
  sliders, and line-like progress when it produces clearer state than opacity.
- Use blur only as a small bridge for awkward crossfades. Keep it rare and
  lightweight.

## Gesture Rules

- Use pointer capture after drag starts.
- Ignore extra touch points during an active drag.
- Consider velocity as well as distance for dismissal or commitment.
- Apply damping or friction beyond natural boundaries instead of hard stops.
- Use springs for interruptible gestures or drag returns. Keep bounce subtle.

## Performance Rules

- Animate transform and opacity by default.
- Avoid animating width, height, margin, padding, top, or left unless the layout
  change itself is the point and performance is acceptable.
- Avoid updating inherited CSS variables every frame in large subtrees. Directly
  update the element transform instead.
- Prefer CSS animations for predetermined motion under load.
- Use WAAPI when programmatic animation needs browser-native performance.

## Accessibility Rules

- Respect `prefers-reduced-motion`. Reduced motion means fewer and gentler
  animations, not necessarily no visual transition.
- Remove position and transform motion first. Keep short opacity or color
  transitions only when they clarify state.
- Gate hover-only effects behind fine-pointer media queries.
- Keep keyboard and focus behavior useful even when motion is removed.
- Destructive hold-to-confirm flows need real pointer, keyboard, blur, cancel,
  and Escape behavior. CSS progress alone is not enough.

## Demo Review Format

When reviewing UI code for this skill, lead with concrete findings. For visual
or motion polish, use this table shape:

| Before                           | After                                                 | Why                                                     |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `transition: all 300ms`          | `transition: transform 180ms var(--ease-out-ui)`      | Limit the animated property and make feedback immediate |
| `transform: scale(0)`            | `transform: scale(0.95); opacity: 0`                  | Preserve visual continuity on entry                     |
| `ease-in` on UI feedback         | `ease-out` or a stronger custom curve                 | Slow starts make feedback feel late                     |
| Hover animation applies on touch | Gate with `@media (hover: hover) and (pointer: fine)` | Avoid stuck hover states on phones                      |
| Reduced motion hides the lesson  | Render a settled or representative state              | The invariant should remain inspectable                 |

For implementation tasks, make the change directly and report the verification
that proves the demo still teaches its invariant.

## Review Checklist

- Does the demo teach the article's named invariant?
- Are hierarchy, labels, controls, and motion aligned to that invariant?
- Does the first frame communicate before playback starts?
- Does the final or reduced-motion state still teach?
- Are routine interactions quick and responsive?
- Are animation properties explicit and limited?
- Are colors semantic rather than decorative?
- Are mobile labels, controls, and figure rhythm readable?
- Is there any layout shift caused by hover, focus, labels, or dynamic values?
- Did visual verification include desktop and phone-width viewports when UI was
  affected?
