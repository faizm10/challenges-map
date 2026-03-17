"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, MapPin, Radio, Users } from "lucide-react";

import {
  Map as BaseMap,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import type { PublicMapResponse } from "@/lib/types";

type PublicLiveMapProps = {
  initialData: PublicMapResponse;
};

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
  const hasUserMovedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleInteraction = () => {
      hasUserMovedRef.current = true;
    };

    map.on("dragstart", handleInteraction);
    map.on("zoomstart", handleInteraction);
    map.on("rotatestart", handleInteraction);
    map.on("pitchstart", handleInteraction);

    return () => {
      map.off("dragstart", handleInteraction);
      map.off("zoomstart", handleInteraction);
      map.off("rotatestart", handleInteraction);
      map.off("pitchstart", handleInteraction);
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded || points.length === 0 || hasUserMovedRef.current) return;

    if (points.length === 1) {
      map.easeTo({
        center: points[0],
        zoom: 13.8,
        duration: 900,
      });
      return;
    }

    map.fitBounds(buildBounds(points), {
      padding: {
        top: 92,
        right: 56,
        bottom: 92,
        left: 56,
      },
      duration: 900,
      maxZoom: 14.8,
    });
  }, [isLoaded, map, points]);

  return null;
}

export function PublicLiveMap({ initialData }: PublicLiveMapProps) {
  const [data, setData] = useState(initialData);
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/public/map", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const next = (await response.json()) as PublicMapResponse;
        if (!cancelled) {
          setData(next);
        }
      } catch {
        // Keep existing map state during transient polling failures.
      }
    };

    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const allMapPoints = useMemo(() => {
    const points: Array<[number, number]> = [[data.union.longitude, data.union.latitude]];

    for (const route of data.teamRoutes) {
      for (const point of route.points) {
        points.push([point.longitude, point.latitude]);
      }
    }

    for (const location of data.latestLocations) {
      points.push([location.longitude, location.latitude]);
    }

    return points;
  }, [data.latestLocations, data.teamRoutes, data.union.latitude, data.union.longitude]);

  const latestByTeam = useMemo(
    () => new globalThis.Map(data.latestLocations.map((location) => [location.team_id, location])),
    [data.latestLocations]
  );

  return (
    <main className="relative h-[100dvh] min-h-screen overflow-hidden bg-[#0b0b0d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(216,95,58,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_32%)]" />

      <div className="absolute inset-0">
        <BaseMap center={[data.union.longitude, data.union.latitude]} zoom={12.8} theme="dark">
          <MapAutoFit points={allMapPoints} />
          <MapControls />

          <MapMarker latitude={data.union.latitude} longitude={data.union.longitude}>
            <MarkerContent>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
                <MapPin className="h-5 w-5" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="rounded-2xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-xl">
                <strong>{data.union.name}</strong>
                <p className="text-slate-500">{data.union.label}</p>
              </div>
            </MarkerPopup>
          </MapMarker>

          {data.teamRoutes.map((route) => {
            const routeCoords = route.points.map(
              (point) => [point.longitude, point.latitude] as [number, number]
            );

            return (
              <div key={`public-route-${route.team_id}`}>
                {routeCoords.length >= 2 ? (
                  <MapRoute
                    color={route.color}
                    coordinates={routeCoords}
                    id={`public-team-route-${route.team_id}`}
                    opacity={0.94}
                    width={2}
                  />
                ) : null}

                {route.points.map((point, index) => {
                  const isLatestRoutePoint = index === route.points.length - 1;

                  return (
                    <MapMarker
                      key={`public-checkpoint-${route.team_id}-${point.checkin_type}-${point.challenge_id ?? "none"}-${point.created_at}`}
                      latitude={point.latitude}
                      longitude={point.longitude}
                    >
                      <MarkerContent>
                        <div className="flex h-5 w-5 items-center justify-center">
                          <span
                            className="rounded-full border-2 border-[#0b0b0d] shadow-[0_10px_24px_rgba(0,0,0,0.3)]"
                            style={{
                              width: isLatestRoutePoint ? 10 : 8,
                              height: isLatestRoutePoint ? 10 : 8,
                              backgroundColor: route.color,
                            }}
                          />
                        </div>
                      </MarkerContent>
                    </MapMarker>
                  );
                })}
              </div>
            );
          })}

          {data.latestLocations.map((location) => (
            <MapMarker
              key={`public-latest-${location.team_id}-${location.gps_captured_at ?? location.label}`}
              latitude={location.latitude}
              longitude={location.longitude}
            >
              <MarkerContent>
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{ backgroundColor: location.color }}
                  />
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: location.color }}
                  />
                  <span
                    className="relative block h-4 w-4 rounded-full border-[3px] border-black shadow-[0_18px_36px_rgba(0,0,0,0.36)]"
                    style={{ backgroundColor: location.color }}
                  />
                </div>
              </MarkerContent>
              <MarkerPopup>
                <div className="rounded-2xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-xl">
                  <strong>{location.team_name}</strong>
                  <p className="text-slate-500">{location.badge_label}</p>
                  <p className="mt-1 text-xs text-slate-500">{location.label}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                  {location.gps_captured_at ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(location.gps_captured_at).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}
        </BaseMap>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="flex h-full flex-col justify-between p-3 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="pointer-events-auto w-full max-w-sm rounded-[24px] border border-white/10 bg-black/58 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">
                    <Radio className="h-3.5 w-3.5 text-[#d85f3a]" />
                    Live map
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Converge Map
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    Team positions and checkpoint routes update automatically.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2 text-white/56">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                      Live teams
                    </span>
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-white">
                    {data.latestLocations.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 self-start">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/58 px-4 py-2 text-sm font-medium text-white/88 backdrop-blur-xl transition hover:border-white/18 hover:bg-black/70"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            {data.latestLocations.length === 0 ? (
              <div className="pointer-events-auto w-full max-w-sm rounded-[24px] border border-white/10 bg-black/58 p-4 text-sm text-white/72 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                No team GPS check-ins yet.
              </div>
            ) : (
              <div className="pointer-events-auto w-full max-w-md rounded-[24px] border border-white/10 bg-black/58 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setIsFeedOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/46">
                      Team feed
                    </div>
                    <div className="mt-1 text-sm text-white/58">
                      {data.teamRoutes.length} teams
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/78">
                    {isFeedOpen ? "Hide" : "Show"}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isFeedOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isFeedOpen ? (
                  <div className="mt-3 space-y-2">
                    {data.teamRoutes.map((route) => {
                      const latest = latestByTeam.get(route.team_id);

                      return (
                        <div
                          key={`legend-${route.team_id}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: route.color }}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-white">
                                {route.team_name}
                              </div>
                              <div className="truncate text-xs text-white/48">{route.badge_label}</div>
                            </div>
                          </div>
                          <div className="max-w-[46%] truncate text-right text-xs text-white/56">
                            {latest?.label ?? "No GPS yet"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
