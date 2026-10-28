"use client";

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import { useEffect, useState } from "react";

import "leaflet/dist/leaflet.css";

interface SatelliteMapProps {
  bbox?: number[];
  tileUrl?: string;
  markers?: {
    latitude: number;
    longitude: number;
    label: string;
    details?: string;
  }[];

  /**
   * Show the OpenStreetMap base map.
   * Useful for the main explorer.
   */
  showBaseMap?: boolean;

  /**
   * Show the blue scene footprint.
   * Disabled by default because the imagery itself
   * already provides the geographic context.
   */
  showFootprint?: boolean;

  /**
   * Show Leaflet zoom controls.
   */
  zoomControl?: boolean;

  /**
   * Map height.
   */
  heightClass?: string;

  /**
   * Satellite imagery opacity.
   */
  imageryOpacity?: number;
}

interface TileJsonResponse {
  tiles?: string[];
  minzoom?: number;
  maxzoom?: number;
  bounds?: number[];
}

function MapController({
  bbox,
}: {
  bbox?: number[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!bbox || bbox.length !== 4) {
      return;
    }

    const [
      minLon,
      minLat,
      maxLon,
      maxLat,
    ] = bbox;

    const bounds = L.latLngBounds(
      [minLat, minLon],
      [maxLat, maxLon]
    );

    map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 13,
    });
  }, [bbox, map]);

  return null;
}

export default function SatelliteMap({
  bbox,
  tileUrl,
  markers,
  showBaseMap = true,
  showFootprint = false,
  zoomControl = true,
  heightClass = "h-[500px]",
  imageryOpacity = 0.95,
}: SatelliteMapProps) {
  const [imageryUrl, setImageryUrl] =
    useState<string | null>(null);

  const [imageryError, setImageryError] =
    useState<string | null>(null);

  const [loadingImagery, setLoadingImagery] =
    useState(false);

  useEffect(() => {
    if (!tileUrl) {
      setImageryUrl(null);
      setImageryError(null);
      setLoadingImagery(false);
      return;
    }

    const currentTileUrl = tileUrl;

    let cancelled = false;

    async function loadTileJson() {
      try {
        setLoadingImagery(true);
        setImageryError(null);

        const response =
          await fetch(currentTileUrl);

        if (!response.ok) {
          throw new Error(
            `TileJSON request failed: ${response.status}`
          );
        }

        const data =
          (await response.json()) as TileJsonResponse;

        if (
          !data.tiles ||
          data.tiles.length === 0
        ) {
          throw new Error(
            "Planetary Computer did not return an imagery tile URL."
          );
        }

        if (!cancelled) {
          setImageryUrl(data.tiles[0]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to load Sentinel-2 imagery:",
            error
          );

          setImageryError(
            error instanceof Error
              ? error.message
              : "Satellite imagery failed to load."
          );

          setImageryUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingImagery(false);
        }
      }
    }

    loadTileJson();

    return () => {
      cancelled = true;
    };
  }, [tileUrl]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-slate-800 bg-black ${heightClass}`}
    >
      <MapContainer
        center={[20.3, 85.8]}
        zoom={9}
        zoomControl={zoomControl}
        className="h-full w-full"
      >

        {/* =============================== */}
        {/* BASE MAP */}
        {/* =============================== */}

        {showBaseMap && (
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* =============================== */}
        {/* SENTINEL-2 IMAGERY */}
        {/* =============================== */}

        {imageryUrl && (
          <TileLayer
            key={imageryUrl}
            url={imageryUrl}
            opacity={imageryOpacity}
            attribution="Sentinel-2 / Microsoft Planetary Computer"
            maxZoom={18}
            zIndex={10}
          />
        )}

        {markers?.map((marker) => (
          <CircleMarker
            key={`${marker.latitude}:${marker.longitude}:${marker.label}`}
            center={[marker.latitude, marker.longitude]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#45d483",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{marker.label}</strong>
              {marker.details && <div>{marker.details}</div>}
            </Popup>
          </CircleMarker>
        ))}

        {/* =============================== */}
        {/* MAP CONTROLLER */}
        {/* =============================== */}

        {bbox &&
          bbox.length === 4 && (
            <MapController bbox={bbox} />
          )}

        {/* =============================== */}
        {/* OPTIONAL FOOTPRINT */}
        {/* =============================== */}

        {showFootprint &&
          bbox &&
          bbox.length === 4 && (
            <div />
          )}

      </MapContainer>

      {/* =============================== */}
      {/* LOADING */}
      {/* =============================== */}

      {loadingImagery && (
        <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-300 shadow-lg">
          Loading satellite imagery...
        </div>
      )}

      {/* =============================== */}
      {/* ERROR */}
      {/* =============================== */}

      {imageryError && (
        <div className="absolute left-4 right-4 top-4 z-[1000] rounded-lg border border-red-800 bg-red-950/90 px-4 py-3 text-sm text-red-300 shadow-lg">
          <p className="font-medium">
            Satellite imagery unavailable
          </p>

          <p className="mt-1 text-xs">
            {imageryError}
          </p>
        </div>
      )}

    </div>
  );
}