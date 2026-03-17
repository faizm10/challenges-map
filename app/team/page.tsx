import type { Metadata } from "next";

import { TeamDashboard } from "@/components/team-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team Dashboard",
  description:
    "Team login and live checkpoint dashboard for Converge, including challenge proof, GPS check-ins, and standings.",
};

export default function TeamPage() {
  return <TeamDashboard />;
}
