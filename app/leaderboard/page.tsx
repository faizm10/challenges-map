import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Leaderboard",
  description:
    "Animated live podium leaderboard for Converge with real-time team ranking updates.",
};

export default function LeaderboardPage() {
  redirect(`/e/${DEFAULT_DEV_GAME_SLUG}/leaderboard`);
}
