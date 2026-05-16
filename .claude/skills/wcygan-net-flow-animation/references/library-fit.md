# Library Fit

Do not add an animation dependency by default. wcygan.net's current pattern is
plain React state plus CSS in `src/styles/app.css`. Use this reference when a
future demo seems complex enough to justify a dependency discussion.

Sources checked: 2026-05-16.

## Decision Rule

Stay native when:

- the demo is a finite step sequence with Play/Step/Reset
- state can be represented by one `activeStep`
- transitions are mostly opacity, transform, color, or border changes
- the component lives in a blog post and should remain easy to read

Consider a library only when:

- the demo has multiple independent timelines
- users can scrub, drag, reverse, interrupt, or branch the sequence
- layout transitions are the main challenge
- physics/springs are materially clearer than timed easing
- the state model needs explicit visualization or testable transitions

If a library is justified, first check `package.json`, `deno.json`, bundle
impact, SSR behavior, reduced-motion support, and whether project guidance still
allows it.

## Motion For React

Fit: rich React UI animation, shared layout transitions, presence/exit
animations, gesture states, and scroll-triggered effects.

Use when:

- layout changes are the hard part
- `AnimatePresence`, `layout`, or `layoutId` removes significant code
- the post needs gesture-like interaction that plain CSS makes awkward

Avoid when:

- a CSS transition from `data-state` is enough
- the demo should not introduce a new runtime dependency

Motion's React docs cover gesture props and scroll animation. Its layout docs
describe `layout` and `layoutId` for animating layout/shared-element changes.
Motion also has reduced-motion APIs, so any use must wire those into the demo.

## React Spring

Fit: spring-physics values and interruptible motion.

Use when:

- the teaching value depends on physical easing, drag, or elastic response
- the animation should settle naturally instead of using fixed durations

Avoid when:

- deterministic step timing matters more than physical feel
- the demo uses static panels and rails

React Spring centers on `useSpring` and `animated` components. Its
`useReducedMotion` hook can skip animations globally by making springs jump to
the goal value.

## GSAP

Fit: imperative timelines, labels, pauses, scroll-linked timelines, and complex
multi-element choreography.

Use when:

- the demo is closer to a timeline editor than a React state display
- labelled timeline positions, `addPause`, `timeScale`, or scroll-triggered
  choreography remove real complexity
- a post needs a polished cinematic sequence and the dependency is explicit

Avoid when:

- React state should remain the source of truth
- selectors and imperative DOM control would obscure the demo logic

GSAP Timeline supports labels, pauses, callbacks, progress, and time scaling.
ScrollTrigger is powerful for scroll-based choreography. `gsap.matchMedia()` can
scope desktop/mobile and `prefers-reduced-motion` behavior and revert created
animations.

## XState / State Machines

Fit: complex step logic, branching states, explicit events, visualization, and
model-based tests.

Use when:

- a demo is no longer a linear sequence
- states such as `idle`, `playing`, `paused`, `scrubbing`, `complete`, and
  `reducedMotion` have non-trivial transitions
- the correctness of allowed transitions matters more than animation polish

Avoid when:

- `activeStep` plus `isPlaying` is enough

XState v5 models application logic as state machines, statecharts, and actors,
and `@xstate/react` provides React hooks. For this site, use it only after a
component's state has outgrown local React state.

## Sources

- Motion: [React docs](https://motion.dev/docs/react)
- Motion: [Layout animation](https://motion.dev/docs/react-layout-animations)
- Motion: [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)
- React Spring: [Getting started](https://react-spring.dev/docs/getting-started)
- React Spring:
  [useReducedMotion](https://react-spring.dev/docs/utilities/use-reduced-motion)
- GSAP: [Timeline](https://gsap.com/docs/v3/GSAP/Timeline/)
- GSAP: [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- GSAP:
  [`gsap.matchMedia()`](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/)
- Stately: [XState docs](https://stately.ai/docs/xstate)
- Stately: [`@xstate/react`](https://stately.ai/docs/xstate-react)
