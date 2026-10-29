"use client";

import { useEffect, useRef, useState } from "react";

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

let mapsScript: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (mapsScript) {
    return mapsScript;
  }

  mapsScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsScript = null;
      reject(new Error("Google Maps could not be loaded. Check the API key and network connection."));
    };
    document.head.appendChild(script);
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
  const [error, setError] = useState<string | null>(null);
  const [obliqueUnavailable, setObliqueUnavailable] = useState(false);
  const [streetViewUnavailable, setStreetViewUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      setError(
        "Map views need NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add a restricted Google Maps JavaScript API key and redeploy the frontend."
      );
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapElement.current) {
          return;
        }

        const googleMap = new google.maps.Map(mapElement.current, {
          center: DEFAULT_CENTER,
          zoom: 7,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        const streetView = googleMap.getStreetView();
        panorama.current = streetView;
        map.current = googleMap;

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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Google Maps failed to load."
          );
        }
      });

    return () => {
      cancelled = true;
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

    const mapTypeByMode: Partial<
      Record<MapMode, google.maps.MapTypeId>
    > = {
      roadmap: google.maps.MapTypeId.ROADMAP,
      satellite: google.maps.MapTypeId.SATELLITE,
      hybrid: google.maps.MapTypeId.HYBRID,
      terrain: google.maps.MapTypeId.TERRAIN,
      oblique: google.maps.MapTypeId.SATELLITE,
      heatmap: google.maps.MapTypeId.ROADMAP,
    };

    googleMap.setMapTypeId(mapTypeByMode[mode] ?? google.maps.MapTypeId.ROADMAP);

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
