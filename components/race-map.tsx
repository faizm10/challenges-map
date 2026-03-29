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
import { resolveEventFinish } from "@/lib/game-finish";
import type { EventFinishDisplay, TeamLatestLocation, TeamSeed } from "@/lib/types";

type RaceMapProps = {
  teams: Array<Pick<TeamSeed, "id" | "teamName" | "startLocationName" | "color" | "routeLine" | "coordinates">>;
  latestLocations?: TeamLatestLocation[];
  /** When omitted, defaults to the built-in Toronto Union reference point. */
  eventFinish?: EventFinishDisplay;
};

export function RaceMap({ teams, latestLocations = [], eventFinish }: RaceMapProps) {
  const fin = eventFinish ?? resolveEventFinish(null, null);
  return (
    <Card className="overflow-hidden border-white/8 bg-[#120f10]/88 p-0">
      <div className="h-[320px] w-full sm:h-[380px] lg:h-[420px]">
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

          <MapMarker longitude={fin.longitude} latitude={fin.latitude}>
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-lg">
                <Flag className="h-4 w-4" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                <strong>{fin.shortName}</strong>
                <p className="text-muted-foreground">{fin.addressLabel}</p>
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

          {latestLocations.map((location) => (
            <MapMarker
              key={`latest-${location.team_id}`}
              longitude={location.longitude}
              latitude={location.latitude}
            >
              <MarkerContent>
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <span
                    className="absolute inline-flex h-5 w-5 rounded-full opacity-35"
                    style={{ backgroundColor: location.color }}
                  />
                  <span
                    className="relative h-3.5 w-3.5 rounded-full border-2 border-black"
                    style={{ backgroundColor: location.color }}
                  />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                  <strong>{location.team_name}</strong>
                  <p className="text-muted-foreground">{location.label}</p>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}
        </Map>
      </div>
    </Card>
  );
}
