"use client";

import { MapPin } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import type { AdminTeamRoute, EventFinishDisplay, TeamLatestLocation } from "@/lib/types";

type CheckinMapProps = {
  latestLocations: TeamLatestLocation[];
  teamRoutes: AdminTeamRoute[];
  eventFinish: EventFinishDisplay;
};

function formatCoordinate(value: number) {
  return value.toString();
}

export function CheckinMap({ latestLocations, teamRoutes, eventFinish }: CheckinMapProps) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[#120f10]/88 p-0">
      <div className="h-[320px] w-full sm:h-[380px] lg:h-[420px]">
        <Map center={[-79.3842, 43.6515]} zoom={12.6}>
          <MapControls />

          <MapMarker latitude={eventFinish.latitude} longitude={eventFinish.longitude}>
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                <strong>{eventFinish.shortName}</strong>
                <p className="text-muted-foreground">{eventFinish.addressLabel}</p>
              </div>
            </MarkerPopup>
          </MapMarker>

          {teamRoutes.map((route) => {
            const routeCoords = route.points.map((point) => [point.longitude, point.latitude] as [number, number]);

            return (
              <div key={`team-layer-${route.team_id}`}>
                {route.points.length >= 2 ? (
                  <MapRoute
                    color={route.color}
                    coordinates={routeCoords}
                    id={`team-progress-${route.team_id}`}
                    opacity={0.92}
                    width={2.5}
                  />
                ) : null}

                {route.points.map((point, index) => {
                  const isLatest = index === route.points.length - 1;
                  const dotSize = isLatest ? 24 : 18;
                  const innerSize = isLatest ? 13 : 10;

                  return (
                    <MapMarker
                      key={`checkpoint-${route.team_id}-${point.checkin_type}-${point.challenge_id ?? "none"}-${point.created_at}`}
                      latitude={point.latitude}
                      longitude={point.longitude}
                    >
                      <MarkerContent>
                        <div
                          className="relative flex items-center justify-center"
                          style={{ width: dotSize, height: dotSize }}
                        >
                          {isLatest ? (
                            <>
                              <span
                                className="absolute inline-flex rounded-full opacity-30"
                                style={{
                                  width: dotSize,
                                  height: dotSize,
                                  backgroundColor: route.color,
                                }}
                              />
                              <span
                                className="absolute inline-flex rounded-full opacity-25 animate-ping"
                                style={{
                                  width: dotSize,
                                  height: dotSize,
                                  backgroundColor: route.color,
                                }}
                              />
                            </>
                          ) : null}
                          <span
                            className="relative rounded-full border-[2.5px] border-black shadow-[0_12px_34px_rgba(0,0,0,0.22)]"
                            style={{
                              width: innerSize,
                              height: innerSize,
                              backgroundColor: route.color,
                            }}
                          />
                        </div>
                      </MarkerContent>
                      <MarkerPopup>
                        <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-md">
                          <strong>{route.team_name}</strong>
                          <p className="text-muted-foreground">{point.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(point.created_at).toLocaleString()}</p>
                          <p className="mt-1 font-mono text-xs text-slate-600">
                            {formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {route.completed_labels.length ? route.completed_labels.join(" -> ") : "No mapped route yet"}
                          </p>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  );
                })}
              </div>
            );
          })}
        </Map>
      </div>
    </Card>
  );
}
