# Camera and framing

Read this when choosing a camera, changing a scene's framing, or tuning orbit
and zoom behavior. A technical scene should stay legible before the reader
touches the controls.

## Choose a projection

Use an orthographic camera when readers need to compare sizes and positions
without perspective changing apparent scale. Use perspective when depth and
spatial distance are part of the explanation. Set the target explicitly and
frame the complete meaningful scene, including labels and motion endpoints.

For orthographic scenes, fit the world to both dimensions of the stage. Existing
scenes use the smaller of a width-based and height-based zoom, for example:

```ts
const fittedZoom = Math.min(size.width / worldWidth, size.height / worldHeight);
```

Choose `worldWidth` and `worldHeight` from the scene's intended bounds, not from
one object. Keep room for responsive labels and interaction controls outside the
stage.

## Separate fitting from user commands

- Define a camera target and named default/mobile poses. Keep camera pose changes
  separate from responsive zoom fitting.
- Refit projection and invalidate after stage-size changes. A resize should not
  reset the reader's orbit or replace a deliberate zoom unless the scene needs
  a new device-specific starting pose.
- Make reset, top, and directional commands explicit. Keep them independent of
  changing records, timer state, or other simulation updates.
- Clamp zoom and polar angle to useful bounds. Disable panning when it can lose
  the model; keep orbit and wheel zoom when free inspection helps the lesson.
- In demand-rendered scenes, call `invalidate()` after camera changes and
  control updates.

Kafka Partitioning and Failure Detectors both use orthographic cameras and fit
zoom from the stage dimensions. Failure Detectors uses a higher mobile pose to
separate labels from nodes; Kafka's Top view remains draggable.

## Verify the frame

Use desktop and mobile sizes from the article-integration reference. Check the
full model fits at each supported configuration, labels remain separated, orbit
limits preserve a useful view, zoom remains bounded, and resizing preserves the
user's camera state. Exercise reset and any named view followed by dragging and
zooming.
