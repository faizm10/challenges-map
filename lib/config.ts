import type { TeamSeed } from "@/lib/types";

export const COOKIE_NAME = "race_to_union_session";
export const SESSION_SECRET = "race-to-union-next-session-secret-v1";
export const CHALLENGE_PROOF_BUCKET = "challenge-proof";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD_REQUEST = 10;
export const MAX_CHALLENGES = 5;

export const CHALLENGE_SCORE_MAX_POINTS = 10;
export const CHALLENGE_SCORE_MIN_POINTS = 2;
export const CHALLENGE_SCORE_WINDOW_MINUTES = 45;

export const UNION_STATION = {
  name: "Union Station",
  finishPoint: "Union Station, Front Street entrance",
  coordinates: [-79.3807, 43.6453] as [number, number],
};

export const TEAM_SEED: TeamSeed[] = [
  {
    id: 1,
    teamName: "Team 1",
    startLocationName: "Krembil Research Institute",
    address: "60 Leonard Ave, Toronto, ON M5T 0S8",
    routeSummary:
      "Head east toward Spadina or University, continue south through downtown, then east on Front Street to Union Station.",
    walkTime: "35-45 min",
    color: "#d85f3a",
    badgeLabel: "Streetcar Spark",
    coordinates: [-79.4015, 43.6516],
    routeLine: [
      [-79.4015, 43.6516],
      [-79.3948, 43.6492],
      [-79.3895, 43.6468],
      [-79.3807, 43.6453],
    ],
  },
  {
    id: 2,
    teamName: "Team 2",
    startLocationName: "John P. Robarts Research Library",
    address: "130 St George St, Toronto, ON M5S 0C2",
    routeSummary:
      "Cut southeast through the U of T and Queen's Park area, continue south on University Avenue, then east on Front Street to Union Station.",
    walkTime: "40-50 min",
    color: "#2c7a7b",
    badgeLabel: "Stacks Sprint",
    coordinates: [-79.3998, 43.6642],
    routeLine: [
      [-79.3998, 43.6642],
      [-79.3928, 43.6591],
      [-79.3876, 43.6512],
      [-79.3845, 43.6472],
      [-79.3807, 43.6453],
    ],
  },
  {
    id: 3,
    teamName: "Team 3",
    startLocationName: "Coronation Park",
    address: "711 Lake Shore Blvd W, Toronto, ON M5V 1A7",
    routeSummary:
      "Follow the waterfront east via Queens Quay or the waterfront trail, then head north into Union Station.",
    walkTime: "30-40 min",
    color: "#2563eb",
    badgeLabel: "Harbour Heat",
    coordinates: [-79.3992, 43.6357],
    routeLine: [
      [-79.3992, 43.6357],
      [-79.3935, 43.6383],
      [-79.3872, 43.6409],
      [-79.3834, 43.6429],
      [-79.3807, 43.6453],
    ],
  },
  {
    id: 4,
    teamName: "Team 4",
    startLocationName: "Regent Park",
    address: "620 Dundas St E, Toronto, ON M5A 3S4",
    routeSummary:
      "Walk west along Dundas Street or Queen Street into downtown, then head south to Front Street and continue to Union Station.",
    walkTime: "40-50 min",
    color: "#8b5cf6",
    badgeLabel: "East End Echo",
    coordinates: [-79.3618, 43.6603],
    routeLine: [
      [-79.3618, 43.6603],
      [-79.3694, 43.6574],
      [-79.3764, 43.6524],
      [-79.3794, 43.6483],
      [-79.3807, 43.6453],
    ],
  },
  {
    id: 5,
    teamName: "Team 5",
    startLocationName: "Wellesley-Magill Park",
    address: "125 Homewood Ave, Toronto, ON M4Y 0A6",
    routeSummary:
      "Head southwest toward Yonge Street or Bay Street, walk south through downtown, then continue along Front Street to Union Station.",
    walkTime: "45-60 min",
    color: "#c0841a",
    badgeLabel: "Midtown Rush",
    coordinates: [-79.3735, 43.6671],
    routeLine: [
      [-79.3735, 43.6671],
      [-79.3784, 43.6608],
      [-79.3812, 43.6542],
      [-79.3816, 43.6487],
      [-79.3807, 43.6453],
    ],
  },
];
