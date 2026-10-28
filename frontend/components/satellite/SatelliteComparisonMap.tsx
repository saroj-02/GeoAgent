"use client";

import SatelliteMap from "@/components/satellite/SatelliteMap";

interface SatelliteComparisonMapProps {
  bbox?: number[];
  tileUrl?: string;
}

export default function SatelliteComparisonMap({
  bbox,
  tileUrl,
}: SatelliteComparisonMapProps) {
  return (
    <SatelliteMap
      bbox={bbox}
      tileUrl={tileUrl}
      showBaseMap={false}
      showFootprint={false}
      zoomControl={false}
      heightClass="h-[340px]"
      imageryOpacity={1}
    />
  );
}