"use client";

import { MapPin } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import { UNION_STATION } from "@/lib/config";
import type { TeamLatestLocation } from "@/lib/types";

type CheckinMapProps = {
  latestLocations: TeamLatestLocation[];
};

export function CheckinMap({ latestLocations }: CheckinMapProps) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[#120f10]/88 p-0">
      <div className="h-[320px] w-full sm:h-[380px] lg:h-[420px]">
        <Map center={[-79.3842, 43.6515]} zoom={12.6}>
          <MapControls />

          <MapMarker
            latitude={UNION_STATION.coordinates[1]}
            longitude={UNION_STATION.coordinates[0]}
          >
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                <strong>{UNION_STATION.name}</strong>
                <p className="text-muted-foreground">{UNION_STATION.finishPoint}</p>
              </div>
            </MarkerPopup>
          </MapMarker>

          {latestLocations.map((location) => (
            <MapMarker
              key={`checkin-${location.team_id}`}
              latitude={location.latitude}
              longitude={location.longitude}
            >
              <MarkerContent>
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <span
                    className="absolute inline-flex h-6 w-6 rounded-full opacity-30"
                    style={{ backgroundColor: location.color }}
                  />
                  <span
                    className="relative h-4 w-4 rounded-full border-2 border-black"
                    style={{ backgroundColor: location.color }}
                  />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                  <strong>{location.team_name}</strong>
                  <p className="text-muted-foreground">{location.label}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </p>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}
        </Map>
      </div>
    </Card>
  );
}
