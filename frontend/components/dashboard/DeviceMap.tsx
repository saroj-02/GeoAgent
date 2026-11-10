"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface DeviceMarker {
  latitude: number;
  longitude: number;
  label: string;
  details: string;
}

type MapMode =
  | "roadmap"
  | "satellite"
  | "hybrid"
  | "terrain"
  | "street-view"
  | "oblique"
  | "heatmap";

const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: "roadmap", label: "Roadmap" },
  { id: "satellite", label: "Satellite" },
  { id: "hybrid", label: "Hybrid" },
  { id: "terrain", label: "Terrain" },
  { id: "street-view", label: "Street View" },
  { id: "oblique", label: "45° Oblique" },
  { id: "heatmap", label: "Heatmap" },
];

const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 20.3,
  lng: 85.8,
};

let mapsScript: Promise<google.maps.MapsLibrary> | null = null;

function loadGoogleMaps(
  apiKey: string
): Promise<google.maps.MapsLibrary> {
  if (mapsScript) return mapsScript;

  mapsScript = (async () => {
    if (typeof window.google?.maps?.importLibrary !== "function") {
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(
          'script[src*="maps.googleapis.com/maps/api/js"]'
        );

        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(), {
            once: true,
          });
          existingScript.addEventListener(
            "error",
            () => reject(new Error("Google Maps script failed to load.")),
            { once: true }
          );
          return;
        }

        const script = document.createElement("script");
        script.src =
          `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Google Maps script failed to load."));

        document.head.appendChild(script);
      });
    }

    if (typeof window.google?.maps?.importLibrary !== "function") {
      throw new Error("Google Maps importLibrary is unavailable.");
    }

    return (await window.google.maps.importLibrary(
      "maps"
    )) as google.maps.MapsLibrary;
  })().catch((error) => {
    mapsScript = null;
    throw error;
  });

  return mapsScript;
}

interface DeviceMapProps {
  markers: DeviceMarker[];
  heightClass?: string;
}

export default function DeviceMap({
  markers,
  heightClass = "h-[560px]",
}: DeviceMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const panorama = useRef<google.maps.StreetViewPanorama | null>(null);
  const [mode, setMode] = useState<MapMode>("roadmap");
  const [mapReady, setMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obliqueUnavailable, setObliqueUnavailable] = useState(false);
  const [streetViewUnavailable, setStreetViewUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const previousAuthFailure = window.gm_authFailure;
    const handleGoogleAuthFailure = () => {
      if (!cancelled) {
        setMapLoading(false);
        setError(
          "Google Maps rejected the API key. Check that Maps JavaScript API is enabled and the key allows this frontend domain."
        );
      }
    };
    window.gm_authFailure = handleGoogleAuthFailure;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      setMapLoading(false);
      setError(
        "Map views need NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add a restricted Google Maps JavaScript API key and redeploy the frontend."
      );
      return () => {
        cancelled = true;
        if (window.gm_authFailure === handleGoogleAuthFailure) {
          window.gm_authFailure = previousAuthFailure;
        }
      };
    }

    loadGoogleMaps(apiKey)
      .then((mapsLibrary) => {
        if (cancelled || !mapElement.current) {
          return;
        }

        const googleMap = new mapsLibrary.Map(mapElement.current, {
          center: DEFAULT_CENTER,
          zoom: 7,
          mapTypeId: "roadmap",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        const streetView = googleMap.getStreetView();
        panorama.current = streetView;
        map.current = googleMap;

        const loadingTimeout = window.setTimeout(() => {
          setMapLoading(false);
        }, 10000);
        googleMap.addListener("tilesloaded", () => {
          window.clearTimeout(loadingTimeout);
          setMapLoading(false);
        });

        setMapReady(true);

        streetView.addListener("status_changed", () => {
          setStreetViewUnavailable(
            streetView.getStatus() ===
              google.maps.StreetViewStatus.ZERO_RESULTS
          );
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setMapLoading(false);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Google Maps failed to load."
          );
        }
      });

    return () => {
      cancelled = true;
      if (window.gm_authFailure === handleGoogleAuthFailure) {
        window.gm_authFailure = previousAuthFailure;
      }
    };
  }, []);

  useEffect(() => {
    const googleMap = map.current;
    if (!googleMap || !mapReady || markers.length === 0) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((marker) => {
      const position = {
        lat: marker.latitude,
        lng: marker.longitude,
      };
      bounds.extend(position);

      const mapMarker = new google.maps.Marker({
        map: googleMap,
        position,
        title: marker.label,
      });
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = marker.label;
      const details = document.createElement("p");
      details.textContent = marker.details;
      content.append(title, details);

      const infoWindow = new google.maps.InfoWindow({
        content,
      });
      mapMarker.addListener("click", () => {
        infoWindow.open({
          map: googleMap,
          anchor: mapMarker,
        });
      });
    });

    if (markers.length === 1) {
      googleMap.setCenter(bounds.getCenter());
      googleMap.setZoom(14);
    } else {
      googleMap.fitBounds(bounds, 48);
    }
  }, [mapReady, markers]);

  useEffect(() => {
    const googleMap = map.current;
    const streetView = panorama.current;

    if (!googleMap || !streetView || !mapReady) {
      return;
    }

    setObliqueUnavailable(false);
    setStreetViewUnavailable(false);

    if (mode === "street-view") {
      const center = googleMap.getCenter();
      if (center) {
        streetView.setPosition(center);
      }
      streetView.setVisible(true);
      return;
    }

    streetView.setVisible(false);
    googleMap.setTilt(0);

    const mapTypeByMode: Record<MapMode, google.maps.MapTypeId | string> = {
  roadmap: "roadmap",
  satellite: "satellite",
  hybrid: "hybrid",
  terrain: "terrain",
  oblique: "satellite",
  heatmap: "roadmap",
  "street-view": "roadmap",
};

googleMap.setMapTypeId(mapTypeByMode[mode] ?? "roadmap");

    if (mode === "oblique") {
      googleMap.setZoom(Math.max(googleMap.getZoom() ?? 18, 18));
      googleMap.setTilt(45);
      window.setTimeout(() => {
        if (map.current === googleMap && googleMap.getTilt() !== 45) {
          setObliqueUnavailable(true);
        }
      }, 1200);
    }

    const heatCircles =
      mode === "heatmap"
        ? markers.map(
            (marker) =>
              new google.maps.Circle({
                map: googleMap,
                center: {
                  lat: marker.latitude,
                  lng: marker.longitude,
                },
                radius: 450,
                strokeOpacity: 0,
                fillColor: "#ff3b4e",
                fillOpacity: 0.18,
              })
          )
        : [];

    return () => {
      heatCircles.forEach((circle) => circle.setMap(null));
    };
  }, [mapReady, markers, mode]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-panel">
      <div
        aria-label="Map views"
        className="flex gap-2 overflow-x-auto border-b border-border p-3"
        role="group"
      >
        {MAP_MODES.map((mapMode) => (
          <button
            key={mapMode.id}
            type="button"
            aria-pressed={mode === mapMode.id}
            onClick={() => setMode(mapMode.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm transition-colors ${
              mode === mapMode.id
                ? "bg-live text-white"
                : "bg-bg text-text-secondary hover:text-text-primary"
            }`}
          >
            {mapMode.label}
          </button>
        ))}
      </div>

      <div className={`relative w-full ${heightClass}`}>
        <div ref={mapElement} className="h-full w-full" />
        {error && (
          <div
            role="alert"
            className="absolute inset-x-4 top-4 z-10 rounded-lg border border-red-700/60 bg-slate-950/95 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}
        {mapLoading && !error && (
          <div
            role="status"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/85 text-sm text-text-secondary"
          >
            <span
              aria-hidden="true"
              className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-live"
            />
            <span>Loading interactive map…</span>
          </div>
        )}
        {streetViewUnavailable && mode === "street-view" && (
          <div
            role="status"
            className="absolute inset-x-4 top-4 z-10 rounded-lg border border-border bg-slate-950/95 p-4 text-sm text-text-primary"
          >
            Street View imagery is not available near this map location.
          </div>
        )}
        {obliqueUnavailable && mode === "oblique" && (
          <div
            role="status"
            className="absolute inset-x-4 top-4 z-10 rounded-lg border border-border bg-slate-950/95 p-4 text-sm text-text-primary"
          >
            45° imagery is not available for this location. Google provides
            oblique imagery only in supported areas at supported zoom levels.
          </div>
        )}
        {mode === "heatmap" && markers.length === 0 && !error && (
          <div className="absolute inset-x-4 top-4 z-10 rounded-lg border border-border bg-slate-950/95 p-4 text-sm text-text-primary">
            No device locations are available to display as a heatmap.
          </div>
        )}
      </div>
    </section>
  );
}
