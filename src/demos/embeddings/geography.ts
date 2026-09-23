export type GlobePoint = [number, number, number];
export interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Rounded city-center coordinates, in degrees north and east.
export const CITIES: readonly City[] = [
  { id: "chicago", name: "Chicago", latitude: 41.88, longitude: -87.63 },
  {
    id: "san-francisco",
    name: "San Francisco",
    latitude: 37.77,
    longitude: -122.42,
  },
  { id: "berlin", name: "Berlin", latitude: 52.52, longitude: 13.41 },
  { id: "bangalore", name: "Bangalore", latitude: 12.97, longitude: 77.59 },
  { id: "auckland", name: "Auckland", latitude: -36.85, longitude: 174.76 },
  { id: "tokyo", name: "Tokyo", latitude: 35.68, longitude: 139.69 },
];

/** North is +Y; the prime meridian meets the equator at +Z; east is +X. */
export function globePoint(
  latitude: number,
  longitude: number,
  radius = 1,
): GlobePoint {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  return [
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  ];
}

export function latitudeRing(latitude: number, radius = 1): GlobePoint[] {
  return Array.from({ length: 121 }, (_, index) =>
    globePoint(latitude, index * 3, radius),
  );
}

export function longitudeRing(longitude: number, radius = 1): GlobePoint[] {
  return Array.from({ length: 61 }, (_, index) =>
    globePoint(-90 + index * 3, longitude, radius),
  );
}

/** The two arcs share the equatorial point directly beneath the city. */
export function coordinateArcs(city: City, radius = 1) {
  return {
    latitude: Array.from({ length: 49 }, (_, index) =>
      globePoint((city.latitude * index) / 48, city.longitude, radius),
    ),
    longitude: Array.from({ length: 73 }, (_, index) =>
      globePoint(0, (city.longitude * index) / 72, radius),
    ),
  };
}

export function formatCoordinate(
  value: number,
  axis: "latitude" | "longitude",
) {
  const direction =
    axis === "latitude" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  return `${(Math.round(Math.abs(value) * 10) / 10).toFixed(1)}° ${direction}`;
}
