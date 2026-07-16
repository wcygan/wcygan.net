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
    let creationVersion = 0;
    let map: LeafletMap | null = null;
    let pendingFrame = 0;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const cancelPendingFrame = () => {
      if (pendingFrame) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      }
    };

    async function initializeMap() {
      const version = ++creationVersion;

      try {
        const L = await import("leaflet");

        if (disposed || version !== creationVersion || !mapElementRef.current) {
          return;
        }

        setError(null);
        setIsReady(false);
        const reduceMotion = motionQuery.matches;
        mapElementRef.current.classList.remove(
          "leaflet-fade-anim",
          "leaflet-zoom-anim",
        );
        const leafletMap = L.map(mapElementRef.current, {
          scrollWheelZoom: true,
          fadeAnimation: !reduceMotion,
          inertia: !reduceMotion,
          markerZoomAnimation: !reduceMotion,
          zoomAnimation: !reduceMotion,
        }).setView([lat, lng], zoom);
        map = leafletMap;

        L.tileLayer(OPENSTREETMAP_TILES, {
          attribution: OPENSTREETMAP_ATTRIBUTION,
          detectRetina: true,
          maxZoom: 19,
        }).addTo(leafletMap);

        const icon = L.divIcon({
          className: "osm-map-marker",
          html: "<span></span>",
          iconAnchor: [22, 22],
          iconSize: [44, 44],
          popupAnchor: [0, -22],
        });

        L.marker([lat, lng], {
          alt: markerLabel,
          icon,
          title: markerLabel,
        })
          .addTo(leafletMap)
          .bindPopup(markerLabel);

        mapRef.current = leafletMap;
        leafletMap.whenReady(() => {
          if (
            disposed ||
            version !== creationVersion ||
            map !== leafletMap ||
            mapRef.current !== leafletMap
          ) {
            return;
          }

          setIsReady(true);
          pendingFrame = window.requestAnimationFrame(() => {
            pendingFrame = 0;
            if (
              disposed ||
              version !== creationVersion ||
              map !== leafletMap ||
              mapRef.current !== leafletMap
            ) {
              return;
            }

            leafletMap.invalidateSize();
          });
        });
      } catch (caughtError) {
        if (!disposed && version === creationVersion) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : String(caughtError),
          );
        }
      }
    }

    const recreateMapForMotion = () => {
      cancelPendingFrame();
      map?.stop();
      map?.remove();
      map = null;
      if (mapRef.current) {
        mapRef.current = null;
      }
      setIsReady(false);
      void initializeMap();
    };

    motionQuery.addEventListener("change", recreateMapForMotion);
    initializeMap();

    return () => {
      disposed = true;
      cancelPendingFrame();
      motionQuery.removeEventListener("change", recreateMapForMotion);
      const removedMap = map;
      removedMap?.remove();
      if (mapRef.current === removedMap) {
        mapRef.current = null;
      }
      map = null;
      setIsReady(false);
    };
  }, [lat, lng, markerLabel, zoom]);

  const style = {
    "--osm-map-height": `${height}px`,
  } as CSSProperties;

  return (
    <figure
      className="osm-map-frame"
      data-graphic-frame="workbench"
      style={style}
    >
      <div className="osm-map-shell" data-graphic-stage="flush">
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
