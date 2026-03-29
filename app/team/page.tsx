import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Team Dashboard",
  description:
    "Team login and live checkpoint dashboard for Converge, including challenge proof, GPS check-ins, and standings.",
};

export default function TeamPage() {
  redirect(`/e/${DEFAULT_DEV_GAME_SLUG}/team`);
}
