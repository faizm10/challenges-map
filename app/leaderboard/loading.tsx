import { LoadingScreen } from "@/components/loading-screen";

export default function LeaderboardLoading() {
  return (
    <LoadingScreen
      description="Syncing live podium positions."
      label="Awaiting leaderboard..."
    />
  );
}
