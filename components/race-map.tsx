"use client";

import { Flag } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import { UNION_STATION } from "@/lib/config";
import type { TeamSeed } from "@/lib/types";

type RaceMapProps = {
  teams: Array<Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color" | "routeLine" | "coordinates">>;
};

export function RaceMap({ teams }: RaceMapProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="h-[420px] w-full">
        <Map center={[-79.3842, 43.6515]} zoom={12.4}>
          <MapControls />

          {teams.map((team) => (
            <MapMarker
              key={team.id}
              longitude={team.coordinates[0]}
              latitude={team.coordinates[1]}
            >
              <MarkerContent>
                <div
                  className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: team.color }}
                />
              </MarkerContent>
              <MarkerPopup>
                <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                  <strong>{team.teamName}</strong>
                  <p className="text-muted-foreground">{team.startLocationName}</p>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

          <MapMarker
            longitude={UNION_STATION.coordinates[0]}
            latitude={UNION_STATION.coordinates[1]}
          >
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-lg">
                <Flag className="h-4 w-4" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                <strong>{UNION_STATION.name}</strong>
                <p className="text-muted-foreground">{UNION_STATION.finishPoint}</p>
              </div>
            </MarkerPopup>
          </MapMarker>

          {teams.map((team) => (
            <MapRoute
              key={team.id}
              id={`team-route-${team.id}`}
              color={team.color}
              coordinates={team.routeLine}
              width={4}
              opacity={0.92}
            />
          ))}
        </Map>
      </div>
    </Card>
  );
}
