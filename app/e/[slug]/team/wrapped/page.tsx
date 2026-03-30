import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TeamWrapped } from "@/components/team-wrapped";
import { getGameBySlug, getTeamDashboard } from "@/lib/game";
import { requireTeamSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  return {
    title: game ? `Wrapped — ${game.name}` : "Team Wrapped",
    description: "Photo recap wall for a team’s uploaded challenge proof.",
  };
}

export default async function EventTeamWrappedPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const session = await requireTeamSession();
  if (!session?.teamId || session.gameId !== game.id) {
    redirect(`/e/${slug}/team`);
  }

  const dashboard = await getTeamDashboard(session.gameId, session.teamId);
  if (!dashboard) {
    redirect(`/e/${slug}/team`);
  }

  const photos = dashboard.challenges
    .flatMap((challenge) =>
      challenge.uploads
        .filter((upload) => upload.media_type === "image")
        .map((upload) => ({
          key: `${challenge.id}-${upload.id}`,
          signedUrl: upload.signed_url,
          fileName: upload.file_name,
          uploadedAt: upload.uploaded_at,
          challengeOrder: challenge.challenge_order,
          challengeTitle: challenge.title,
        }))
    )
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  return (
    <TeamWrapped
      eventName={game.name}
      teamName={dashboard.team.team_name}
      teamColor={dashboard.team.color}
      totalPoints={dashboard.teamStats.total_points}
      photos={photos}
    />
  );
}
