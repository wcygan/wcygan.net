import { describe, expect, it } from "vitest";
import {
  CITIES,
  coordinateArcs,
  formatCoordinate,
  globePoint,
  latitudeRing,
  longitudeRing,
} from "./geography";
import { landDetailPoints, landPoints } from "./land-data";
import {
  LAND_DETAIL_POSITIONS,
  LAND_POINT_POSITIONS,
} from "./land-points.generated";

function expectPoint(actual: number[], expected: number[]) {
  actual.forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(expected[index], 8),
  );
}

describe("geographic coordinates", () => {
  it("places north above the equator and east toward positive X", () => {
    expectPoint(globePoint(0, 0), [0, 0, 1]);
    expectPoint(globePoint(0, 90), [1, 0, 0]);
    expectPoint(globePoint(0, -90), [-1, 0, 0]);
    expectPoint(globePoint(90, 0), [0, 1, 0]);
    expectPoint(globePoint(-90, 139), [0, -1, 0]);
  });

  it("keeps both coordinate arcs on the sphere and joins them beneath the city", () => {
    for (const city of CITIES) {
      const arcs = coordinateArcs(city, 2);
      expectPoint(arcs.longitude[0], [0, 0, 2]);
      expectPoint(arcs.longitude.at(-1)!, arcs.latitude[0]);
      expectPoint(
        arcs.latitude.at(-1)!,
        globePoint(city.latitude, city.longitude, 2),
      );
      for (const point of [...arcs.latitude, ...arcs.longitude]) {
        expect(Math.hypot(...point)).toBeCloseTo(2, 8);
      }
      // Longitude travels along the equator; latitude travels up or down from it.
      expect(arcs.longitude.every((point) => point[1] === 0)).toBe(true);
      const heights = arcs.latitude.map((point) => point[1]);
      expect(heights.at(-1)! > heights[0]).toBe(city.latitude > 0);
    }
  });

  it("closes parallels and joins every meridian at the poles", () => {
    for (const latitude of [-60, -30, 0, 30, 60]) {
      const ring = latitudeRing(latitude);
      expectPoint(ring[0], ring.at(-1)!);
    }
    for (const longitude of [-180, -90, 0, 90, 180]) {
      const meridian = longitudeRing(longitude);
      expectPoint(meridian[0], [0, -1, 0]);
      expectPoint(meridian.at(-1)!, [0, 1, 0]);
    }
  });

  it("uses hemisphere labels without losing negative coordinates", () => {
    expect(formatCoordinate(-90.07, "longitude")).toBe("90.1° W");
    expect(formatCoordinate(139.69, "longitude")).toBe("139.7° E");
    expect(formatCoordinate(-33.87, "latitude")).toBe("33.9° S");
    expect(formatCoordinate(29.95, "latitude")).toBe("30.0° N");
  });

  it("keeps generated land buffers in sync with the source geometry", () => {
    const quantize = (coordinates: number[]) =>
      coordinates.map((coordinate) => {
        const result = Math.round(coordinate * 32_767) / 32_767;
        return result === 0 ? 0 : Math.fround(result);
      });
    expect(LAND_POINT_POSITIONS.length).toBe(2_339 * 3);
    expect([...LAND_POINT_POSITIONS]).toEqual(quantize(landPoints(1).flat()));
    expect(LAND_DETAIL_POSITIONS.length).toBe(6_983 * 3);
    expect([...LAND_DETAIL_POSITIONS]).toEqual(
      quantize(landDetailPoints(1).flat()),
    );
  });
});
