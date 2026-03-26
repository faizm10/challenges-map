import type { Metadata } from "next";

import { LandingPage } from "@/components/landing-page";
import { TEAM_SEED } from "@/lib/config";
import { getMarketingHomeMockData } from "@/lib/marketing-mock-data";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Converge",
  description:
    "Converge is a Toronto team city challenge where squads move through the city, complete live HQ drops, and converge at Union.",
};

function buildMapTeams() {
  return TEAM_SEED.map((team) => ({
    id: team.id,
    teamName: team.teamName,
    startLocationName: team.startLocationName,
    color: team.color,
  }));
}

export default function HomePage() {
  const initialData = getMarketingHomeMockData();

  return (
    <LandingPage
      initialData={initialData}
      mapTeams={buildMapTeams()}
      useLiveLeaderboardPoll={false}
    />
  );
}
