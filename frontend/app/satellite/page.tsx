"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import dynamic from "next/dynamic";

import { apiClient } from "@/lib/api";

const SatelliteComparisonMap = dynamic(
  () =>
    import(
      "@/components/satellite/SatelliteComparisonMap"
    ),
  {
    ssr: false,
  }
);

interface SatelliteScene {
  id: string;
  collection?: string;
  datetime?: string;
  cloud_cover?: number;
  bbox?: number[];
  geometry?: {
    type: string;
    coordinates: number[][][];
  };
  thumbnail_url?: string;
  tile_url?: string;
  properties?: {
    platform?: string;
    instruments?: string[];
    "s2:mgrs_tile"?: string;
    constellation?: string;
    "eo:cloud_cover"?: number;
    "s2:product_uri"?: string;
  };
}

interface SatelliteStatus {
  status?: string;
  provider?: string;
  collection?: string;
  stac_api?: string;
  authentication_required?: boolean;
  message?: string;
}

interface SatelliteScenesResponse {
  status?: string;
  provider?: string;
  collection?: string;
  count?: number;
  scenes?: SatelliteScene[];
  query?: {
    bbox?: number[];
    start_date?: string | null;
    end_date?: string | null;
    max_cloud_cover?: number | null;
    limit?: number;
  };
}

const SatelliteMap = dynamic(
  () =>
    import(
      "@/components/satellite/SatelliteMap"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-400">
        Loading map...
      </div>
    ),
  }
);

const DEFAULT_BBOX =
  "85.70,20.20,85.90,20.40";

export default function SatelliteExplorerPage() {
  const [status, setStatus] =
    useState<SatelliteStatus | null>(null);

  const [scenes, setScenes] =
    useState<SatelliteScene[]>([]);

  const [selectedScene, setSelectedScene] =
    useState<SatelliteScene | null>(null);

  const [compareScene, setCompareScene] =
    useState<SatelliteScene | null>(null);

  const [bbox, setBbox] =
    useState(DEFAULT_BBOX);

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [maxCloudCover, setMaxCloudCover] =
    useState("100");

  const [limit, setLimit] =
    useState("10");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadSatelliteData = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          statusResponse,
          scenesResponse,
        ] = await Promise.all([
          apiClient.getSatelliteStatus(),

          apiClient.getSatelliteScenes(
            bbox,
            {
              limit: Number(limit) || 10,

              ...(startDate
                ? {
                    start_date: startDate,
                  }
                : {}),

              ...(endDate
                ? {
                    end_date: endDate,
                  }
                : {}),

              ...(maxCloudCover
                ? {
                    max_cloud_cover:
                      Number(maxCloudCover),
                  }
                : {}),
            }
          ),
        ]);

        setStatus(
          statusResponse as SatelliteStatus
        );

        const data =
          scenesResponse as SatelliteScenesResponse;

        const returnedScenes =
          data.scenes ?? [];

        setScenes(returnedScenes);

        setSelectedScene(
          returnedScenes[0] ?? null
        );

        setCompareScene(null);
      } catch (err) {
        console.error(
          "Failed to load satellite data:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load satellite imagery."
        );

        setScenes([]);
        setSelectedScene(null);
        setCompareScene(null);
      } finally {
        setLoading(false);
      }
    },
    [
      bbox,
      limit,
      maxCloudCover,
      startDate,
      endDate,
    ]
  );

  useEffect(() => {
    loadSatelliteData();
  }, [loadSatelliteData]);

  const clearFilters = () => {
    setBbox(DEFAULT_BBOX);
    setStartDate("");
    setEndDate("");
    setMaxCloudCover("100");
    setLimit("10");
    setCompareScene(null);
  };

  const formatDate = (
    datetime?: string
  ) => {
    if (!datetime) {
      return "Unknown";
    }

    return new Date(
      datetime
    ).toLocaleString();
  };

  const formatCloudCover = (
    value?: number
  ) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "Unknown";
    }

    return `${value.toFixed(2)}%`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ================================= */}
        {/* HEADER */}
        {/* ================================= */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold">
              Satellite Explorer
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Explore Sentinel-2 satellite imagery
              from Microsoft Planetary Computer.
            </p>
          </div>

          <button
            onClick={loadSatelliteData}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

        </div>

        {/* ================================= */}
        {/* SEARCH CONTROLS */}
        {/* ================================= */}

        <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Search Imagery
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Filter Sentinel-2 scenes by
              location, date and cloud coverage.
            </p>

          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            {/* Bounding Box */}

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Bounding Box
              </label>

              <input
                value={bbox}
                onChange={(event) =>
                  setBbox(event.target.value)
                }
                placeholder="minLon,minLat,maxLon,maxLat"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Example: 85.70,20.20,85.90,20.40
              </p>
            </div>

            {/* Start Date */}

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            {/* End Date */}

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Maximum Cloud Cover */}

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Max Cloud Cover %
              </label>

              <input
                type="number"
                min="0"
                max="100"
                value={maxCloudCover}
                onChange={(event) =>
                  setMaxCloudCover(
                    event.target.value
                  )
                }
                placeholder="e.g. 30"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Results */}

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Results
              </label>

              <select
                value={limit}
                onChange={(event) =>
                  setLimit(event.target.value)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="5">
                  5 scenes
                </option>

                <option value="10">
                  10 scenes
                </option>

                <option value="20">
                  20 scenes
                </option>

                <option value="50">
                  50 scenes
                </option>

                <option value="100">
                  100 scenes
                </option>
              </select>
            </div>

          </div>

          {/* Search buttons */}

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              onClick={loadSatelliteData}
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Searching..."
                : "Search Imagery"}
            </button>

            <button
              onClick={clearFilters}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Clear Filters
            </button>

          </div>

        </section>

        {/* ================================= */}
        {/* STATUS CARDS */}
        {/* ================================= */}

        <section className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Provider
            </p>

            <p className="mt-2 text-lg font-semibold">
              {status?.provider ??
                "Unknown"}
            </p>

          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Collection
            </p>

            <p className="mt-2 text-lg font-semibold">
              {status?.collection ??
                "Unknown"}
            </p>

          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-sm text-slate-400">
              Scenes Found
            </p>

            <p className="mt-2 text-lg font-semibold">
              {scenes.length}
            </p>

          </div>

        </section>

        {/* ================================= */}
        {/* ERROR */}
        {/* ================================= */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">

            <p className="font-medium">
              Satellite search failed
            </p>

            <p className="mt-1">
              {error}
            </p>

          </div>
        )}

        {/* ================================= */}
        {/* SCENE LIST + DETAILS */}
        {/* ================================= */}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* ================================= */}
          {/* SCENE LIST */}
          {/* ================================= */}

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="mb-5">

              <h2 className="text-xl font-semibold">
                Satellite Scenes
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {scenes.length} scenes returned
              </p>

            </div>

            {loading ? (

              <div className="py-12 text-center text-slate-400">
                Searching satellite imagery...
              </div>

            ) : scenes.length === 0 ? (

              <div className="py-12 text-center text-slate-400">
                No satellite scenes found.
              </div>

            ) : (

              <div className="space-y-3">

                {scenes.map((scene) => {

                  const isSelected =
                    selectedScene?.id ===
                    scene.id;

                  const isCompared =
                    compareScene?.id ===
                    scene.id;

                  return (
                    <div
                      key={scene.id}
                      className={`rounded-xl border p-4 transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-800 bg-slate-950 hover:border-slate-600"
                      }`}
                    >

                      {/* Scene information */}

                      <button
                        onClick={() =>
                          setSelectedScene(
                            scene
                          )
                        }
                        className="w-full text-left"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <p className="truncate font-medium">
                              {scene.id}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {formatDate(
                                scene.datetime
                              )}
                            </p>

                          </div>

                          <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                            {formatCloudCover(
                              scene.cloud_cover
                            )}
                          </span>

                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">

                          <span>
                            {scene.properties
                              ?.platform ??
                              "Sentinel-2"}
                          </span>

                          <span>
                            •
                          </span>

                          <span>
                            Tile{" "}
                            {scene.properties?.[
                              "s2:mgrs_tile"
                            ] ??
                              "Unknown"}
                          </span>

                        </div>

                      </button>

                      {/* Compare button */}

                      <div className="mt-3">

                        {selectedScene?.id ===
                        scene.id ? (
                          <span className="text-xs text-blue-400">
                            Selected scene
                          </span>
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();

                              if (
                                selectedScene?.id !==
                                scene.id
                              ) {
                                setCompareScene(
                                  scene
                                );
                              }
                            }}
                            className={`rounded-md border px-3 py-1.5 text-xs transition ${
                              isCompared
                                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                : "border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-300"
                            }`}
                          >
                            {isCompared
                              ? "Comparing"
                              : "Compare"}
                          </button>
                        )}

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </section>

          {/* ================================= */}
          {/* SELECTED SCENE */}
          {/* ================================= */}

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <h2 className="mb-5 text-xl font-semibold">
              Scene Details
            </h2>

            {!selectedScene ? (

              <div className="py-12 text-center text-slate-400">
                Select a satellite scene to
                view its details.
              </div>

            ) : (

              <div className="space-y-5">

                {/* Map */}

                <div>
                  <SatelliteMap
                    bbox={
                      selectedScene.bbox
                    }
                    tileUrl={
                      selectedScene.tile_url
                    }
                  />
                </div>

                {/* Thumbnail */}

                {selectedScene.thumbnail_url && (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">

                    <img
                      src={
                        selectedScene.thumbnail_url
                      }
                      alt={
                        selectedScene.id
                      }
                      className="h-56 w-full object-cover"
                      loading="lazy"
                    />

                  </div>
                )}

                {/* Scene ID */}

                <div>

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Scene ID
                  </p>

                  <p className="mt-1 break-all text-sm font-medium">
                    {selectedScene.id}
                  </p>

                </div>

                {/* Metadata */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <p className="text-xs text-slate-500">
                      Acquisition
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedScene.datetime
                      )}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Cloud Cover
                    </p>

                    <p className="mt-1 text-sm">
                      {formatCloudCover(
                        selectedScene.cloud_cover
                      )}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Platform
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedScene
                        .properties
                        ?.platform ??
                        "Unknown"}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      MGRS Tile
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedScene
                        .properties?.[
                        "s2:mgrs_tile"
                      ] ??
                        "Unknown"}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Collection
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedScene.collection ??
                        "Unknown"}
                    </p>

                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Constellation
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedScene
                        .properties
                        ?.constellation ??
                        "Unknown"}
                    </p>

                  </div>

                </div>

                {/* Bounding Box */}

                {selectedScene.bbox && (
                  <div>

                    <p className="text-xs text-slate-500">
                      Bounding Box
                    </p>

                    <p className="mt-1 break-all text-sm">
                      {selectedScene.bbox.join(
                        ", "
                      )}
                    </p>

                  </div>
                )}

                {/* Product URI */}

                {selectedScene.properties?.[
                  "s2:product_uri"
                ] && (
                  <div>

                    <p className="text-xs text-slate-500">
                      Product
                    </p>

                    <p className="mt-1 break-all text-xs text-slate-400">
                      {
                        selectedScene
                          .properties[
                          "s2:product_uri"
                        ]
                      }
                    </p>

                  </div>
                )}

                {/* Tile URL */}

                {selectedScene.tile_url && (
                  <a
                    href={
                      selectedScene.tile_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-blue-800 bg-blue-950/30 p-3 text-sm text-blue-300 transition hover:bg-blue-950/50"
                  >
                    Open satellite tile
                  </a>
                )}

              </div>
            )}

          </section>

          {/* ================================= */}
          {/* SCENE COMPARISON */}
          {/* ================================= */}

          {compareScene && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">

              {/* Comparison header */}

              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-xl font-semibold">
                    Scene Comparison
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Compare the selected scene
                    with another acquisition.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setCompareScene(null)
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                >
                  Close Comparison
                </button>

              </div>

              {/* Comparison cards */}

              <div className="grid gap-6 md:grid-cols-2">

                {/* ============================= */}
                {/* SELECTED SCENE */}
                {/* ============================= */}

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">

                  <div className="border-b border-slate-800 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Selected Scene
                    </p>

                    <p className="mt-1 break-all text-sm font-medium">
                      {selectedScene?.id ??
                        "No scene selected"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(
                        selectedScene?.datetime
                      )}
                    </p>

                  </div>

                  {selectedScene?.tile_url ? (
  <SatelliteComparisonMap
    bbox={selectedScene.bbox}
    tileUrl={selectedScene.tile_url}
  />
) : (
  <div className="flex h-[340px] items-center justify-center text-sm text-slate-500">
    Satellite imagery unavailable
  </div>
)}

                  <div className="grid grid-cols-2 gap-4 p-4">

                    <div>

                      <p className="text-xs text-slate-500">
                        Cloud Cover
                      </p>

                      <p className="mt-1 text-sm">
                        {formatCloudCover(
                          selectedScene?.cloud_cover
                        )}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">
                        Platform
                      </p>

                      <p className="mt-1 text-sm">
                        {selectedScene
                          ?.properties
                          ?.platform ??
                          "Unknown"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* ============================= */}
                {/* COMPARISON SCENE */}
                {/* ============================= */}

                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">

                  <div className="border-b border-slate-800 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Comparison Scene
                    </p>

                    <p className="mt-1 break-all text-sm font-medium">
                      {compareScene.id}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(
                        compareScene.datetime
                      )}
                    </p>

                  </div>

                  {compareScene.tile_url ? (
  <SatelliteComparisonMap
    bbox={compareScene.bbox}
    tileUrl={compareScene.tile_url}
  />
) : (
  <div className="flex h-[340px] items-center justify-center text-sm text-slate-500">
    Satellite imagery unavailable
  </div>
)}

                  <div className="grid grid-cols-2 gap-4 p-4">

                    <div>

                      <p className="text-xs text-slate-500">
                        Cloud Cover
                      </p>

                      <p className="mt-1 text-sm">
                        {formatCloudCover(
                          compareScene.cloud_cover
                        )}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">
                        Platform
                      </p>

                      <p className="mt-1 text-sm">
                        {compareScene
                          .properties
                          ?.platform ??
                          "Unknown"}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            </section>
          )}

        </div>
      </div>
    </main>
  );
}