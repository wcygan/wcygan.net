import { describe, expect, it } from "vitest";
import { OrthographicCamera, Spherical, Vector3 } from "three";
import { fitTransactionZoom, transactionViewAnchors } from "./camera";
import type { Point } from "./geometry";

function basis(theta = 0, phi = 0) {
  const camera = new OrthographicCamera();
  const spherical = new Spherical().setFromVector3(new Vector3(0, 5.5, 16));
  spherical.theta += theta;
  spherical.phi += phi;
  camera.position.setFromSpherical(spherical);
  camera.lookAt(0, 0, 0);
  return {
    right: new Vector3(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .toArray() as Point,
    up: new Vector3(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .toArray() as Point,
  };
}
const viewports = [
  { replicated: false, width: 644, height: 380 },
  { replicated: false, width: 342, height: 380 },
  { replicated: true, width: 644, height: 440 },
  { replicated: true, width: 342, height: 420 },
];
const defaultFit = ({
  replicated,
  width,
  height,
}: (typeof viewports)[number]) =>
  Math.min(
    width / (replicated ? 10.4 : 8.2),
    height / (replicated ? 9.6 : 7.6),
  );

describe("transaction camera fitting", () => {
  it("preserves the approved front view on desktop and mobile for both layouts", () => {
    for (const viewport of viewports) {
      const zoom = defaultFit(viewport);
      expect(
        fitTransactionZoom({ ...viewport, ...basis(), defaultFit: zoom }),
      ).toBeCloseTo(zoom);
    }
  });

  it("keeps every label and cylinder in view after keyboard rotations", () => {
    for (const viewport of viewports) {
      for (const [theta, phi] of [
        [Math.PI / 12, 0],
        [0, -Math.PI / 16],
        [Math.PI / 12, -Math.PI / 16],
        [Math.PI / 2, 0],
        [Math.PI, Math.PI / 4],
      ]) {
        const vectors = basis(theta, phi);
        const zoom = fitTransactionZoom({
          ...viewport,
          ...vectors,
          defaultFit: defaultFit(viewport),
        });
        expect(zoom).toBeGreaterThan(0);
        for (const { position, padding } of transactionViewAnchors(
          viewport.replicated,
        )) {
          const x = Math.abs(
            position.reduce(
              (sum, value, axis) => sum + value * vectors.right[axis],
              0,
            ),
          );
          const y = Math.abs(
            position.reduce(
              (sum, value, axis) => sum + value * vectors.up[axis],
              0,
            ),
          );
          expect(x * zoom + padding[0]).toBeLessThanOrEqual(
            viewport.width / 2 - 4 + 1e-9,
          );
          expect(y * zoom + padding[1]).toBeLessThanOrEqual(
            viewport.height / 2 - 4 + 1e-9,
          );
        }
      }
    }
  });

  it("shrinks the top-down coordinator view enough to keep its fixed-size text inside the stage", () => {
    const viewport = viewports[0];
    const zoom = fitTransactionZoom({
      ...viewport,
      right: [1, 0, 0],
      up: [0, 0, -1],
      defaultFit: defaultFit(viewport),
    });
    expect(zoom).toBeCloseTo((380 / 2 - 4 - 15) / 7);
    expect(zoom).toBeLessThan(defaultFit(viewport));
  });

  it("does not enlarge a reader's zoomed-out view", () => {
    const viewport = viewports[0];
    expect(
      fitTransactionZoom({ ...viewport, ...basis(), defaultFit: 12 }),
    ).toBe(12);
  });
});
