import type { TeamSeed } from "@/lib/types";

export const COOKIE_NAME = "race_to_union_session";
export const SESSION_SECRET = "race-to-union-next-session-secret-v1";
export const CHALLENGE_PROOF_BUCKET = "challenge-proof";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD_REQUEST = 10;
export const MAX_CHALLENGES = 4;
export const DEFAULT_CHECKPOINT_UNLOCK_RADIUS_METERS = 150;
export const CHALLENGE_SUBMISSION_RANK_POINTS = [10, 8, 4, 2] as const;

export const UNION_STATION = {
  name: "Union Station",
  finishPoint: "Union Station, Front Street entrance",
  coordinates: [-79.3807, 43.6453] as [number, number],
};

/**
 * Dev/demo seed only: used by `lib/seed.ts`, scripts, and the local in-memory fallback for the
 * default game (`DEFAULT_DEV_GAME_SLUG` / `LOCAL_FALLBACK_GAME_ID`). Production tenants define
 * teams via the admin API, not this array.
 */
export const TEAM_SEED: TeamSeed[] = [
  {
    id: 1,
    teamName: "Team Izzy",
    startLocationName: "Wellesley-Magill Park",
    address: "125 Homewood Ave, Toronto, ON M4Y 1J2",
    routeSummary:
      "Start at Wellesley-Magill Park, head south to Allan Gardens, continue to Moss Park, then make your way to Union Station.",
    walkTime: "35-45 min",
    color: "#d85f3a",
    badgeLabel: "Streetcar Spark",
    coordinates: [-79.3758768, 43.6674792],
    routeLine: [
      [-79.3758768, 43.6674792],
      [-79.3744096, 43.6617119],
      [-79.3697278, 43.6546438],
      [-79.3807, 43.6453],
    ],
    routeCheckpoints: [
      {
        challengeOrder: 2,
        label: "Allan Gardens",
        address: "160 Gerrard St E, Toronto, ON M5A 2E5",
        coordinates: [-79.3744096, 43.6617119],
      },
      {
        challengeOrder: 3,
        label: "Moss Park",
        address: "Moss Park, Toronto, ON M5A 1S2",
        coordinates: [-79.3697278, 43.6546438],
      },
    ],
  },
  {
    id: 2,
    teamName: "Team Faiz",
    startLocationName: "John P. Robarts Research Library",
    address: "130 St George St, Toronto, ON M5S 1A5",
    routeSummary:
      "Start at Robarts Library, move southeast to the Queen Victoria Statue at Osgoode Hall, continue through the Gardens of Osgoode Hall, then head to Union Station.",
    walkTime: "40-50 min",
    color: "#2c7a7b",
    badgeLabel: "Stacks Sprint",
    coordinates: [-79.3994701, 43.6644349],
    routeLine: [
      [-79.3994701, 43.6644349],
      [-79.3864973, 43.6512511],
      [-79.3857945, 43.6521039],
      [-79.3807, 43.6453],
    ],
    routeCheckpoints: [
      {
        challengeOrder: 2,
        label: "Queen Victoria Statue",
        address: "111 Wellesley St W, Toronto, ON M7A 1A2",
        coordinates: [-79.391347, 43.6618951],
      },
      {
        challengeOrder: 3,
        label: "The Gardens of Osgoode Hall",
        address: "Osgoode Hall, 130 Queen St W, Toronto, ON M5H 2N5",
        coordinates: [-79.3857945, 43.6521039],
      },
    ],
  },
  {
    id: 3,
    teamName: "Team James",
    startLocationName: "Coronation Park",
    address: "711 Lake Shore Blvd W, Toronto, ON M5V 1A7",
    routeSummary:
      "Start at Coronation Park, head east to the Toronto Music Garden, continue to Roundhouse Park, then finish at Union Station.",
    walkTime: "30-40 min",
    color: "#2563eb",
    badgeLabel: "Harbour Heat",
    coordinates: [-79.40609, 43.6342618],
    routeLine: [
      [-79.40609, 43.6342618],
      [-79.3940629, 43.6369692],
      [-79.3853035, 43.6413872],
      [-79.3807, 43.6453],
    ],
    routeCheckpoints: [
      {
        challengeOrder: 2,
        label: "Toronto Music Garden",
        address: "479 Queens Quay W, Toronto, ON M5V 3M8",
        coordinates: [-79.3940629, 43.6369692],
      },
      {
        challengeOrder: 3,
        label: "Roundhouse Park",
        address: "255 Bremner Blvd, Toronto, ON M5V 3M9",
        coordinates: [-79.3853035, 43.6413872],
      },
    ],
  },
  {
    id: 4,
    teamName: "Team Naman",
    startLocationName: "Regent Park",
    address: "620 Dundas St E, Toronto, ON M5A 2B7",
    routeSummary:
      "Start in Regent Park, move south to Sackville Playground, continue to St. Lawrence Market, then head west to Union Station.",
    walkTime: "40-50 min",
    color: "#8b5cf6",
    badgeLabel: "East End Echo",
    coordinates: [-79.3604569, 43.6607056],
    routeLine: [
      [-79.3604569, 43.6607056],
      [-79.3607639, 43.6545926],
      [-79.3719883, 43.6497179],
      [-79.3807, 43.6453],
    ],
    routeCheckpoints: [
      {
        challengeOrder: 2,
        label: "Sackville Playground",
        address: "420 King St E, Toronto, ON M5A 1L4",
        coordinates: [-79.3607639, 43.6545926],
      },
      {
        challengeOrder: 3,
        label: "St. Lawrence Market",
        address: "92 Front St E, Toronto, ON M5E 1C4",
        coordinates: [-79.3719883, 43.6497179],
      },
    ],
  },
];

/** Team IDs used only for the default dev/local fallback game (`LOCAL_FALLBACK_GAME_ID`). */
export const ACTIVE_TEAM_IDS = TEAM_SEED.map((team) => team.id);

/** Local in-memory store and offline fallback only support this single game id. */
export const LOCAL_FALLBACK_GAME_ID = 1;

/** Default slug for legacy redirects and seed data (matches migration default row). */
export const DEFAULT_DEV_GAME_SLUG = "converge";

/**
 * Server-only env name: if value is `"true"` or `"1"`, `/e/create` and `POST /api/games` work without
 * admin sign-in (local QA only). Never enable in production.
 */
export const ALLOW_ANONYMOUS_GAME_CREATE_ENV = "ALLOW_ANONYMOUS_GAME_CREATE" as const;

export function allowAnonymousGameCreateFromEnv() {
  const v = process.env[ALLOW_ANONYMOUS_GAME_CREATE_ENV];
  return v === "true" || v === "1";
}
