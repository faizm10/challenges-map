import { UNION_STATION } from "@/lib/config";
import type { EventFinishDisplay } from "@/lib/types";

export function resolveEventFinish(
  finishPointLabel: string | null | undefined,
  settings: unknown
): EventFinishDisplay {
  const addressLabel = (finishPointLabel ?? "").trim() || UNION_STATION.finishPoint;
  let shortName: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;

  if (settings && typeof settings === "object" && settings !== null && "finish" in settings) {
    const f = (settings as { finish?: unknown }).finish;
    if (f && typeof f === "object" && f !== null) {
      const rec = f as Record<string, unknown>;
      if (typeof rec.shortName === "string" && rec.shortName.trim()) {
        shortName = rec.shortName.trim();
      }
      if (typeof rec.latitude === "number" && Number.isFinite(rec.latitude)) {
        latitude = rec.latitude;
      }
      if (typeof rec.longitude === "number" && Number.isFinite(rec.longitude)) {
        longitude = rec.longitude;
      }
    }
  }

  const name =
    shortName ||
    addressLabel.split(",")[0]?.trim() ||
    UNION_STATION.name;
  const lat = latitude ?? UNION_STATION.coordinates[1];
  const lng = longitude ?? UNION_STATION.coordinates[0];

  return {
    shortName: name.slice(0, 120),
    addressLabel,
    latitude: lat,
    longitude: lng,
  };
}
