import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Map as LeafletMap } from "leaflet";

const ALEXANDERPLATZ_CENTER = [52.5219, 13.4132] as const;
const OPENSTREETMAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface OpenStreetMapProps {
  center?: readonly [number, number];
  height?: number;
  markerLabel?: string;
  zoom?: number;
}

export function OpenStreetMap({
  center = ALEXANDERPLATZ_CENTER,
  height = 420,
  markerLabel = "You are at Alexanderplatz, Berlin",
  zoom = 11,
}: OpenStreetMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [lat, lng] = center;

  useEffect(() => {
    if (typeof window === "undefined" || !mapElementRef.current) return;

    let disposed = false;
    let map: LeafletMap | null = null;

    async function initializeMap() {
      try {
        const L = await import("leaflet");

        if (disposed || !mapElementRef.current) return;

        map = L.map(mapElementRef.current, {
          scrollWheelZoom: true,
        }).setView([lat, lng], zoom);

        L.tileLayer(OPENSTREETMAP_TILES, {
          attribution: OPENSTREETMAP_ATTRIBUTION,
          detectRetina: true,
          maxZoom: 19,
        }).addTo(map);

        const icon = L.divIcon({
          className: "osm-map-marker",
          html: "<span></span>",
          iconAnchor: [11, 11],
          iconSize: [22, 22],
          popupAnchor: [0, -14],
        });

        L.marker([lat, lng], {
          alt: markerLabel,
          icon,
          title: markerLabel,
        })
          .addTo(map)
          .bindPopup(markerLabel);

        mapRef.current = map;
        map.whenReady(() => {
          if (disposed || !map) return;
          setIsReady(true);
          requestAnimationFrame(() => map?.invalidateSize());
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
  }, [lat, lng, markerLabel, zoom]);

  const style = {
    "--osm-map-height": `${height}px`,
  } as CSSProperties;

  return (
    <figure className="osm-map-frame" style={style}>
      <div className="osm-map-shell">
        <div
          ref={mapElementRef}
          aria-label={`OpenStreetMap centered on ${markerLabel}`}
          className="osm-map"
        />

        {!isReady && !error && <p className="osm-map-status">Loading map...</p>}

        {error && (
          <p className="osm-map-status" role="alert">
            Map failed to load: {error}
          </p>
        )}
      </div>
      <figcaption>OpenStreetMap view centered on Berlin, Germany</figcaption>
    </figure>
  );
}
