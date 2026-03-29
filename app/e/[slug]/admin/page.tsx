import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { getGameBySlug } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return {
    title: game ? `HQ Admin — ${game.name}` : "HQ Admin",
    description:
      "HQ control room for challenge release, check-in review, live team progress, media verification, and scoring.",
  };
}

export default async function EventAdminPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  return <AdminDashboard gameSlug={slug} />;
}
