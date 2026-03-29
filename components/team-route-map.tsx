"use client";

import { useEffect, useMemo, useRef } from "react";
import { Compass, MapPin } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import { TEAM_SEED, UNION_STATION } from "@/lib/config";
import type { TeamDashboardResponse } from "@/lib/types";

type TeamRouteMapProps = {
  dashboard: TeamDashboardResponse;
};

function formatCoordinate(value: number) {
  return value.toString();
}

function buildBounds(points: Array<[number, number]>) {
  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];

  for (const [lng, lat] of points.slice(1)) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]];
}

function MapAutoFit({ points }: { points: Array<[number, number]> }) {
  const { map, isLoaded } = useMap();
  const lastFitSignatureRef = useRef("");

  useEffect(() => {
    if (!map || !isLoaded || points.length === 0) return;
    const signature = points.map(([lng, lat]) => `${lng.toFixed(6)}:${lat.toFixed(6)}`).join("|");
    if (lastFitSignatureRef.current === signature) return;

    if (points.length === 1) {
      map.easeTo({
        center: points[0],
        zoom: 13.8,
        duration: 800,
      });
      lastFitSignatureRef.current = signature;
      return;
    }

    map.fitBounds(buildBounds(points), {
      padding: {
        top: 60,
        right: 60,
        bottom: 60,
        left: 60,
      },
      duration: 800,
      maxZoom: 14.8,
    });
    lastFitSignatureRef.current = signature;
  }, [isLoaded, map, points]);

  return null;
}

export function TeamRouteMap({ dashboard }: TeamRouteMapProps) {
  const teamSeed = TEAM_SEED.find((team) => team.id === dashboard.team.id) ?? null;

  const routeStops = useMemo(() => {
    const stops: Array<{
      key: string;
      label: string;
      description: string;
      coordinates: [number, number];
      isComplete: boolean;
    }> = [];

    if (teamSeed) {
      const startCheckpoint = dashboard.checkpoints.find((item) => item.checkin_type === "start") ?? null;
      stops.push({
        key: "start",
        label: "Start",
        description: dashboard.team.address || dashboard.team.start_location_name,
        coordinates: teamSeed.coordinates,
        isComplete: Boolean(startCheckpoint?.latest_checkin),
      });
    }

    const checkpointStops = dashboard.checkpoints
      .filter((item) => item.checkin_type !== "start")
      .map((checkpoint) => {
        if (checkpoint.checkin_type === "finish") {
          return {
            key: checkpoint.key,
            label: "Finish",
            description: UNION_STATION.finishPoint,
            coordinates: UNION_STATION.coordinates as [number, number],
            isComplete: Boolean(checkpoint.latest_checkin),
          };
        }

        const challenge = dashboard.challenges.find((item) => item.id === checkpoint.challenge_id) ?? null;
        if (!challenge) return null;

        const coordinates =
          challenge.kind === "union"
            ? (UNION_STATION.coordinates as [number, number])
            : challenge.checkpoint?.latitude != null && challenge.checkpoint?.longitude != null
              ? ([challenge.checkpoint.longitude, challenge.checkpoint.latitude] as [number, number])
              : null;

        if (!coordinates) return null;

        return {
          key: checkpoint.key,
          label:
            challenge.kind === "union"
              ? "Union Challenge"
              : challenge.checkpoint?.checkpoint_label || `Challenge ${challenge.challenge_order}`,
          description:
            challenge.kind === "union"
              ? UNION_STATION.finishPoint
              : challenge.checkpoint?.checkpoint_address ||
                checkpoint.expected_location_description ||
                checkpoint.expected_location_label,
          coordinates,
          isComplete: challenge.status === "submitted",
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      label: string;
      description: string;
      coordinates: [number, number];
      isComplete: boolean;
    }>;

    stops.push(...checkpointStops);

    return stops;
  }, [dashboard, teamSeed]);

  const nextStop = routeStops.find((stop) => !stop.isComplete) ?? null;
  const lastCompletedStop = [...routeStops].reverse().find((stop) => stop.isComplete) ?? null;
  const nextVisibleChallenge = dashboard.challenges
    .slice()
    .sort((a, b) => a.challenge_order - b.challenge_order)
    .find((challenge) => challenge.is_visible) ?? null;
  const shouldShowScrollCue =
    nextVisibleChallenge?.kind === "checkpoint" &&
    (nextVisibleChallenge.challenge_order === 2 || nextVisibleChallenge.challenge_order === 3);

  const originPoint = useMemo(() => {
    if (
      dashboard.latestLocation &&
      dashboard.latestLocation.longitude != null &&
      dashboard.latestLocation.latitude != null
    ) {
      return {
        label: "Live position",
        description: dashboard.latestLocation.label,
        coordinates: [
          dashboard.latestLocation.longitude,
          dashboard.latestLocation.latitude,
        ] as [number, number],
        isLive: true,
      };
    }

    if (lastCompletedStop) {
      return {
        label: lastCompletedStop.label,
        description: lastCompletedStop.description,
        coordinates: lastCompletedStop.coordinates,
        isLive: false,
      };
    }

    return teamSeed
      ? {
          label: "Start",
          description: dashboard.team.address || dashboard.team.start_location_name,
          coordinates: teamSeed.coordinates,
          isLive: false,
        }
      : {
          label: UNION_STATION.name,
          description: UNION_STATION.finishPoint,
          coordinates: UNION_STATION.coordinates,
          isLive: false,
        };
  }, [dashboard.latestLocation, dashboard.team.address, dashboard.team.start_location_name, lastCompletedStop, teamSeed]);

  const mapPoints = useMemo(() => {
    const points: Array<[number, number]> = [originPoint.coordinates];
    if (
      nextStop &&
      (nextStop.coordinates[0] !== originPoint.coordinates[0] ||
        nextStop.coordinates[1] !== originPoint.coordinates[1])
    ) {
      points.push(nextStop.coordinates);
    }
    return points;
  }, [nextStop, originPoint.coordinates]);

  const hideFutureCopy = nextStop
    ? nextStop.key === "start"
      ? "Start here to reveal your first live route checkpoint."
      : "Future checkpoints stay hidden until you reach this one."
    : "The full route is complete. Only the Union finish remains.";

  return (
    <Card className="overflow-hidden border-white/8 bg-[#120f10]/88 p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Route map</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Next destination</h2>
            <p className="mt-1 text-sm leading-6 text-white/56">
              This view stays focused on the next place your team needs to reach.
            </p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/44">
              Next stop
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {nextStop ? nextStop.label : "Route complete"}
            </p>
            <p className="mt-1 text-xs text-white/48">
              {nextStop ? nextStop.description : "All route checkpoints are complete."}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full sm:h-[380px]">
        <Map center={originPoint.coordinates} zoom={13.2}>
          <MapAutoFit points={mapPoints.length ? mapPoints : [originPoint.coordinates]} />
          <MapControls />

          {nextStop &&
          (nextStop.coordinates[0] !== originPoint.coordinates[0] ||
            nextStop.coordinates[1] !== originPoint.coordinates[1]) ? (
            <MapRoute
              color={dashboard.team.color}
              coordinates={[originPoint.coordinates, nextStop.coordinates]}
              id={`team-route-${dashboard.team.id}`}
              opacity={0.88}
              width={3}
            />
          ) : null}

          <MapMarker
            longitude={originPoint.coordinates[0]}
            latitude={originPoint.coordinates[1]}
          >
            <MarkerContent>
              {originPoint.isLive ? (
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <span
                    className="absolute inline-flex h-10 w-10 rounded-full opacity-20"
                    style={{ backgroundColor: dashboard.team.color }}
                  />
                  <span
                    className="absolute inline-flex h-10 w-10 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: dashboard.team.color }}
                  />
                  <div className="relative flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
                    <Compass className="h-2.5 w-2.5 text-black" />
                  </div>
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-white shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
                  <MapPin className="h-4 w-4" />
                </div>
              )}
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-md">
                <strong>{originPoint.isLive ? "Your latest live pin" : originPoint.label}</strong>
                <p className="text-slate-500">{originPoint.description}</p>
                <p className="mt-1 font-mono text-xs text-slate-600">
                  {formatCoordinate(originPoint.coordinates[1])},{" "}
                  {formatCoordinate(originPoint.coordinates[0])}
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>

          {nextStop ? (
            <MapMarker
              key={nextStop.key}
              longitude={nextStop.coordinates[0]}
              latitude={nextStop.coordinates[1]}
            >
              <MarkerContent>
                <div className="relative flex h-8 w-8 items-center justify-center">
                  <span
                    className="absolute inline-flex h-8 w-8 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: dashboard.team.color }}
                  />
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-black shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
                    style={{
                      backgroundColor: "#f8f3ec",
                    }}
                  />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-md">
                  <strong>{nextStop.label}</strong>
                  <p className="text-slate-500">{nextStop.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Next destination</p>
                </div>
              </MarkerPopup>
            </MapMarker>
          ) : null}
        </Map>
      </div>

      <div className="grid gap-2 border-t border-white/8 px-4 py-4 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/44">
            Current anchor
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{originPoint.label}</p>
          <p className="mt-1 text-xs leading-5 text-white/54">{originPoint.description}</p>
        </div>
        <div className="rounded-[18px] border border-orange-300/18 bg-orange-500/[0.07] px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200">
            Next stop
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {nextStop ? nextStop.label : "All checkpoints complete"}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/54">
            {nextStop ? nextStop.description : "You're through the route unlocks. Finish at Union when ready."}
          </p>
          <p className="mt-2 text-[11px] text-white/44">{hideFutureCopy}</p>
          {shouldShowScrollCue ? (
            <p className="mt-2 text-[11px] text-orange-200/82">
              Scroll down to the challenge queue to view and submit it.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}


