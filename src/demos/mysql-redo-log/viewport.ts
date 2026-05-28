export type CanvasViewport = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
};

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  maxDevicePixelRatio = 2,
): CanvasViewport {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
  const cssWidth = Math.max(1, rect.width);
  const cssHeight = Math.max(1, rect.height);
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { cssWidth, cssHeight, dpr };
}
