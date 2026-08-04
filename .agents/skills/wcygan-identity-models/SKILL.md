---
name: wcygan-identity-models
description: Use when creating, editing, reviewing, or debugging the animated GitHub, LinkedIn, and Projects 3D model links in the wcygan.net homepage IdentityCard. Preserves the cross-browser transparent poster-to-video renderer, VP9-alpha and HEVC-alpha delivery, optical centering, readable starting orientation, playback lifecycle, reduced motion, icon quality, and desktop/mobile visual verification.
---

# wcygan.net Identity Models

Keep the homepage GitHub, LinkedIn, and Projects links recognizable, smooth,
aligned, and visually proportional. These are pre-rendered 3D assets with
transparent padding, not CSS icons. Preserve the asset renderer before tuning
motion or geometry.

Success means:

- the poster and animation look like the same object in the same position;
- the three visible models share one optical row above aligned labels;
- animated models are contiguous, smooth, transparent, and immediately active;
- GitHub and LinkedIn retain their accepted motion and readable identities;
- Projects retains rounded, connected die geometry and deterministic speed; and
- reduced-motion users receive the same recognizable static models.

## Scope And Ownership

Read these sources before changing model behavior:

- `src/components/IdentityCard.tsx`: asset registry, playback lifecycle, start
  phase, playback rate, poster/video handoff, and full-versus-compact rendering;
- `src/styles/app.css`: model grid, media size, optical centering, hover/focus
  scale, and reduced-motion rules;
- `src/lib/identity-model-video.ts`: browser-specific transparent-video format
  selection;
- `public/identity-card/`: transparent posters, VP9-alpha WebM loops, and
  HEVC-alpha MOV loops;
- `scripts/render-identity-die.py`: reproducible Projects geometry, materials,
  camera, lighting, face artwork, and motion path; and
- `AGENTS.md`: homepage composition and visual-validation contract.

The compact article identity remains text-only. Do not add model media to it. Do
not create a second homepage header or model grid.

At `560px` and below, the accepted full-card baseline uses `163.8px` model
media, `16px` labels, a `201px` link-grid height, and a `520px` card height. The
larger grid and card heights provide room for the additional 30% media increase
without crowding the identity line or Writing section. Keep pointer events on
the grid-cell link, not the overflowing transparent media box, so adjacent
mobile targets never steal one another's taps. Clip overflow at the link grid;
the encoded canvases extend beyond their cells, but the calibrated visible model
masses do not.

## Current Known-Good Assets

Treat the checked-in transparent assets as the implementation baseline:

| Model    | Poster               | VP9-alpha WebM       | HEVC-alpha MOV             | Encoded canvas | Frame rate | Playback rate |
| -------- | -------------------- | -------------------- | -------------------------- | -------------- | ---------- | ------------- |
| GitHub   | `github-still.png`   | `github-spin.webm`   | `github-spin-safari.mov`   | 560×560        | 120 fps    | `0.82`        |
| LinkedIn | `linkedin-still.png` | `linkedin-spin.webm` | `linkedin-spin-safari.mov` | 1120×1120      | 60 fps     | `1`           |
| Projects | `die-still.png`      | `die-spin.webm`      | `die-spin-safari.mov`      | 560×560        | 120 fps    | `1.04`        |

At the time this skill was authored:

- `7df2d70` introduced the original identity-card asset and renderer contract;
- `ec19a55` replaced the LinkedIn poster and WebM with the sharper, correctly
  oriented pair; and
- the accepted LinkedIn start is phase `0`, where `in` reads normally with the
  `i` to the left of the `n`.

Use commit history as recovery evidence, not as permission to discard unrelated
working-tree changes. Inspect the current diff and restore only the regressed
model path.

## Rendering Contract

### Use One Renderer Per Animated Model

Every animated tile has exactly two visual layers:

1. a transparent PNG poster while the video is unavailable or intentionally
   paused; and
2. one browser-selected transparent video after the browser fires `playing`.

The poster becomes fully hidden only after playback starts. Never show a
standstill and animation simultaneously. Do not replace a checked-in model with
a DOM/CSS reconstruction, a stack of transformed faces, or a second animation
layer.

The repository stores two encodings of the same animation:

- Apple Safari, iOS browsers, and embedded Apple WebKit receive HEVC-alpha MOV;
  and
- Chromium and Firefox receive VP9-alpha WebM.

Use `preferredTransparentIdentityVideoFormat` to mount exactly one source after
hydration. Do not mount both encodings and depend on `<source>` order or
`canPlayType()`: Chromium on macOS may claim HEVC support without providing the
alpha behavior this component needs. Keep the static poster through SSR and
hydration so an unsupported or failed video never becomes a black or empty tile.

WebKit can decode a VP9-alpha WebM while painting its transparent pixels black.
That failure looks like a rotating model on an opaque black square, even though
the video is otherwise healthy. Treat it as an alpha-decoding incompatibility,
not a CSS background, blend-mode, z-index, or 3D-rendering problem. Do not add a
white matte, `mix-blend-mode`, or a Safari-only static fallback when matching
HEVC-alpha motion is available.

Projects is intentionally rendered by `scripts/render-identity-die.py`. A
six-face CSS cube is not an equivalent fallback: it changes the geometry,
texture, rounding, anti-aliasing, scale, and coordinate system.

### Preserve Optical Centering

The encoded square canvas is not the visible model boundary. Transparent source
padding makes the apparent center different from the element's geometric center.

- Keep the poster and video inside the same `.identity-card__model-media` box.
- Keep the same width, height, and `--identity-model-center-x/y` translation on
  both elements.
- Scale the shared media box for hover/focus. Do not size or translate the
  visible model through a separate child renderer.
- Keep the label in normal flow. Never move it to compensate for a model offset.
- Judge peers by visible mass and label alignment, not encoded canvas size.

An independently centered child using `top: 50%`, `left: 50%`, or its own
`translate(-50%, -50%)` bypasses the asset calibration. That was the cause of
the Projects die appearing vertically above GitHub and LinkedIn.

### Keep Playback Deterministic

- Register GitHub, LinkedIn, and Projects as normal `AnimatedModelId` videos.
- Configure each model's playback rate and starting phase after metadata is
  available, before playing it.
- Apply the starting phase once per mounted video. Do not reset `currentTime` on
  every `canplay`, visibility change, or render.
- Start all eligible videos as soon as the grid is active. Do not add random
  delays, randomized rates, timer-based direction changes, or periodic jumps.
- Pause while the grid is out of view, the document is hidden, or reduced motion
  is requested. Resume coherently from the paused position.
- Preserve linear, constant source playback for Projects. Its speed changes via
  `playbackRate`, not a second CSS rotation.

The outer `.identity-card__model-motion` animation is accepted for GitHub and
LinkedIn. A Projects repair must not change those two animations. Projects uses
the wrapper as a transparent layout container; its 3D motion comes from the
selected alpha video.

## Quality Baseline

### LinkedIn

The current higher-resolution LinkedIn pair is the quality reference for a
recognizable logo model:

- keep the 1120×1120 transparent poster, WebM, and MOV together;
- start at the readable `in` orientation;
- do not mirror the logo or choose a random starting frame;
- preserve crisp edges, the blue body, and neutral lettering; and
- verify the poster-to-video handoff does not flip, jump, or briefly double.

### GitHub

Preserve the recognizable Octocat silhouette, transparent edges, and accepted
slower `0.82` playback. Do not touch its outer motion while fixing another
model.

### Projects

Preserve the source-rendered rounded body, connected edges, shading, pips, and
face artwork. The procedural Blender scene defines six distinct face colors:
coral four-pips, blue bars, a yellow plus, a green diamond, a pink star, and
violet six-pips. Do not use white or neutral-gray face marks. Keep the current
`1.04` playback rate unless the user explicitly requests another speed.

The accepted path combines equal-rate rotations about two orthogonal axes. Its
spatial angular-velocity direction changes continuously while its magnitude
remains constant, so the die tumbles instead of following one horizontal orbit.
The path closes after one loop and makes all six face normals point toward the
camera over time. Do not replace it with random axis changes, eased keyframes,
piecewise turns, or runtime direction changes.

Do not approximate the die with rounded CSS squares. Rounded face corners expose
the page background at 3D joins; square face corners remove the desired
rounding; and a solid CSS core still cannot reproduce the source bevels,
shading, or anti-aliasing.

## Failure Signatures And Recovery

### Correct For A Split Second, Then Broken

This means the static poster is correct and a different renderer takes over when
activity begins.

1. Inspect the active Projects DOM for its `<video>` and `currentSrc`.
2. Confirm the source is `/identity-card/die-spin-safari.mov` in Safari or an
   iOS browser, and `/identity-card/die-spin.webm` in Chromium or Firefox.
3. Confirm the video reaches `playing`, becomes opaque, and hides the poster.
4. Search for substitute cube/face DOM and CSS, especially `top/left: 50%`,
   `translateZ`, `rotate3d`, and manual pips.
5. Remove the substitute renderer and restore the normal video path before
   adjusting size, radius, or motion.

### Black Rectangle In Safari Or iOS

This is the characteristic VP9-alpha failure in Apple WebKit.

1. Inspect each model video's `currentSrc`. Safari and every iOS browser must
   use the matching `*-spin-safari.mov` asset, never `*-spin.webm`.
2. Confirm the mounted source has type `video/quicktime; codecs="hvc1"` and that
   only one source is present.
3. Confirm the MOV uses HEVC with alpha. A normal HEVC or H.264 MOV can play but
   cannot preserve the transparent canvas.
4. Confirm `play()` resolves, `readyState` reaches `4`, and `currentTime`
   advances. Hide the poster only after `playing` fires.
5. If playback is unsupported, retain the transparent poster. Do not reveal a
   broken video or repair it with a matte or blend mode.

### Projects Appears Above The Other Models

Do not add an arbitrary downward offset first.

1. Compare all three `.identity-card__model-media` center-y coordinates.
2. Compare all three `.identity-card__model-label` top coordinates.
3. Confirm Projects uses the same media box and calibrated transform.
4. Look for an independently positioned child or animation transform that owns
   translation as well as rotation.

The labels and media boxes should align within one CSS pixel at a fixed
viewport. A larger object may extend farther above and below, but its visual
center should remain with its peers.

### White Gaps, Detached Corners, Or Faceted Motion

Assume the original model has been replaced or overlaid until proven otherwise.
Manual CSS faces, per-face border radii, backface visibility, depth rounding,
and page-background leakage are typical causes. Restore the contiguous alpha
video. Do not keep patching seams in the substitute cube.

### Model Is Blown Up

Check whether a replacement child uses direct CSS pixel dimensions while the
real assets rely on transparent-canvas framing. Restore the shared media path,
then compare visible footprints in the rendered row. Do not infer scale from the
encoded 560px or 1120px canvas dimensions.

### Motion Starts Late Or Feels Random

Search for randomized delays, `setTimeout`, repeated `currentTime` writes,
per-loop rate changes, or overlapping poster/video opacity. Model variation must
come from the accepted source animation and scoped outer motion, not runtime
surprises.

## Asset Upgrade Rules

When a new 3D render is genuinely required:

- obtain or recover the original scene/model; do not invent missing viewpoints
  from the flattened poster or WebM;
- export the poster and animation from the same camera, framing, materials,
  lighting, and readable initial orientation;
- produce a transparent PNG poster, VP9-alpha WebM, and HEVC-alpha MOV with no
  matte;
- use enough resolution and frame rate to stay crisp at hover scale;
- keep the visible object proportional to its peers despite transparent padding;
- preserve rounded geometry and connected surfaces in the source renderer; and
- replace the poster and both video encodings as one atomic visual set.

For Projects, use the checked-in procedural source rather than rebuilding the
scene by eye:

```bash
blender --background --python scripts/render-identity-die.py -- \
  --output-dir /tmp/identity-die-frames

ffmpeg -framerate 120 -i /tmp/identity-die-frames/%04d.png \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 18 -b:v 0 \
  -row-mt 1 -auto-alt-ref 0 -an public/identity-card/die-spin.webm
```

Encode the Apple copy with AVFoundation's `AVVideoCodecType.hevcWithAlpha`. Do
not substitute ordinary HEVC or H.264. If the starting animation is a WebM,
first preserve its alpha in a ProRes 4444 intermediate:

```bash
ffmpeg -c:v libvpx-vp9 -i public/identity-card/<model>-spin.webm \
  -an -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le \
  /tmp/<model>-alpha-master.mov
```

Feed that intermediate to an `AVAssetReader`/`AVAssetWriter` pipeline configured
for BGRA input and `AVVideoCodecType.hevcWithAlpha` output. Preserve the source
dimensions, frame rate, duration, start frame, and loop point. Direct FFmpeg
VideoToolbox HEVC commands are not sufficient proof: a file may report `hvc1`
without containing an alpha channel.

Generate `die-still.png` from frame `0000.png` so its camera, lighting, scale,
and starting orientation match the animation exactly. The render script reports
the analytic constant angular speed, loop-closure error, and maximum
camera-facing value for all six faces; treat missing face coverage or a broken
loop closure as a failed render.

If the source scene is unavailable and the request requires new faces or a new
camera path, stop and report that constraint. Retain the known-good render until
a real source asset can be produced. A CSS imitation is not an acceptable
quality substitute.

Probe candidate assets before integration:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,avg_frame_rate,r_frame_rate:format=duration \
  -of default=noprint_wrappers=1 public/identity-card/<model>-spin.webm

sips -g pixelWidth -g pixelHeight public/identity-card/<model>-still.png
```

For the MOV, also require `codec_name=hevc`, `codec_tag_string=hvc1`, matching
dimensions/frame rate/duration, and an AVFoundation video track with the
`.containsAlphaChannel` media characteristic. Reject the asset if any of those
checks fail.

## Required Verification

Render `/` at `1440×900` and `390×844`. Check at least the poster frame and two
separated active frames.

For all three models, verify:

- the media center-y coordinates and label-top coordinates match within `1px`;
- the expected `*-spin-safari.mov` is the active `currentSrc` in Safari and iOS,
  while the expected WebM is active in Chromium and Firefox;
- `readyState` is sufficient, playback is not paused, opacity is `1`, and the
  configured playback rate is applied;
- the poster disappears only after the matching video plays;
- no model jumps during the poster-to-video handoff;
- no white matte, double image, detached corner, face seam, or clipping appears;
- hover and focus scale media without moving labels or overlapping targets;
- the page has no horizontal overflow; and
- GitHub and LinkedIn remain visually unchanged when Projects alone is fixed.

At `prefers-reduced-motion: reduce`, confirm videos are hidden and transparent
posters remain recognizable and aligned.

Use real Safari for the Apple path. Chromium inspection cannot prove that an
HEVC asset contains alpha or that WebKit selected it. In Safari, verify all
three MOV sources reach `readyState === 4`, `play()` resolves, and `currentTime`
advances without a black rectangle. Repeat the visual row and motion checks in
Chromium or Firefox to prove the WebM path still rotates.

Inspect browser console warnings and errors, then run:

```bash
deno task pre-commit
deno task build
git diff --check
```

Do not declare the models fixed from source inspection or passing tests alone.
The completion bar is the live poster-to-animation transition and aligned model
row at both required viewports.
