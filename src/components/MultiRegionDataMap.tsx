import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Map as LeafletMap } from "leaflet";

const OPENSTREETMAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CONTINENTAL_US_CENTER: [number, number] = [39.8, -98.6];
const CONTINENTAL_US_BOUNDS: [[number, number], [number, number]] = [
  [24.4, -124.9],
  [49.4, -66.9],
];
const MOBILE_MAP_MAX_WIDTH = 560;

interface RegionMarker {
  code: string;
  id: string;
  label: string;
  position: readonly [number, number];
}

const REGION_MARKERS: readonly RegionMarker[] = [
  {
    code: "VA",
    id: "virginia",
    label: "Ashburn, Virginia",
    position: [39.0438, -77.4874],
  },
  {
    code: "TX",
    id: "texas",
    label: "Richardson, Texas",
    position: [32.9483, -96.7299],
  },
  {
    code: "OR",
    id: "oregon",
    label: "Hillsboro, Oregon",
    position: [45.5229, -122.9898],
  },
];

function clusterMarkerHtml(marker: RegionMarker): string {
  return `
    <span class="multi-region-map-marker-pin" aria-hidden="true">
      <span class="multi-region-map-marker-icon">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <ellipse cx="12" cy="6" rx="7" ry="3.4"></ellipse>
          <path d="M5 6v8c0 1.9 3.1 3.4 7 3.4s7-1.5 7-3.4V6"></path>
          <path d="M5 10c0 1.9 3.1 3.4 7 3.4s7-1.5 7-3.4"></path>
        </svg>
      </span>
      <span class="multi-region-map-marker-code">${marker.code}</span>
    </span>
  `;
}

export function MultiRegionDataMap() {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapElementRef.current) return;

    let disposed = false;
    let map: LeafletMap | null = null;

    async function initializeMap() {
      try {
        const L = await import("leaflet");

        if (disposed || !mapElementRef.current) return;

        const mapWidth = mapElementRef.current.clientWidth;
        const isMobileMap = mapWidth < MOBILE_MAP_MAX_WIDTH;
        const initialZoom = isMobileMap ? 2.25 : 4;
        const leafletMap = L.map(mapElementRef.current).setView(
          CONTINENTAL_US_CENTER,
          initialZoom,
        );
        map = leafletMap;

        L.tileLayer(OPENSTREETMAP_TILES, {
          attribution: OPENSTREETMAP_ATTRIBUTION,
          detectRetina: true,
          maxZoom: 19,
        }).addTo(leafletMap);

        const markerPositions = REGION_MARKERS.map((marker) => {
          const [lat, lng] = marker.position;
          const icon = L.divIcon({
            className: `multi-region-map-marker multi-region-map-marker-${marker.id}`,
            html: clusterMarkerHtml(marker),
            iconAnchor: [24, 48],
            iconSize: [48, 52],
            popupAnchor: [0, -44],
          });

          L.marker([lat, lng], {
            alt: marker.label,
            icon,
            title: marker.label,
          })
            .addTo(leafletMap)
            .bindPopup(marker.label);

          return [lat, lng] as [number, number];
        });

        const viewBounds = isMobileMap
          ? L.latLngBounds(CONTINENTAL_US_BOUNDS)
          : L.latLngBounds(markerPositions).pad(0.2);
        const viewPadding: [number, number] = isMobileMap ? [32, 32] : [64, 64];

        mapRef.current = leafletMap;
        leafletMap.whenReady(() => {
          if (disposed) return;
          setIsReady(true);
          requestAnimationFrame(() => {
            if (disposed) return;
            leafletMap.invalidateSize();
            leafletMap.fitBounds(viewBounds, {
              padding: viewPadding,
            });
          });
        });
      } catch (caughtError) {
        if (!disposed) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : String(caughtError),
          );
        }
      }
    }

    initializeMap();

    return () => {
      disposed = true;
      map?.remove();
      if (mapRef.current === map) {
        mapRef.current = null;
      }
      setIsReady(false);
    };
  }, []);

  const style = {
    "--multi-region-map-height": "420px",
  } as CSSProperties;

  return (
    <figure className="multi-region-map-frame" style={style}>
      <div className="multi-region-map-shell">
        <div
          ref={mapElementRef}
          aria-label="OpenStreetMap showing data centers in Ashburn, Richardson, and Hillsboro"
          className="multi-region-map"
        />

        {!isReady && !error && (
          <p className="multi-region-map-status">Loading map...</p>
        )}

        {error && (
          <p className="multi-region-map-status" role="alert">
            Map failed to load: {error}
          </p>
        )}
      </div>
      <figcaption>
        Data Centers across the US (
        <a href="https://engineering.linkedin.com/content/engineering/en-us/blog/2015/11/introducing-linkedins-west-coast-data-center">
          [1]
        </a>
        ,{" "}
        <a href="https://www.linkedin.com/blog/engineering/data-management/project-altair-the-evolution-of-linkedins-data-center-network">
          [2]
        </a>
        ,{" "}
        <a href="https://security.linkedin.com/content/dam/security/global/site-assets/images/downloads/LinkedIn-ISO-27001-New.pdf">
          [3]
        </a>
        ,{" "}
        <a href="https://engineering.linkedin.com/architecture/brief-history-scaling-linkedin">
          [4]
        </a>
        )
      </figcaption>
    </figure>
  );
}
