import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicLiveMap } from "@/components/public-live-map";
import { getGameBySlug, getPublicMapData } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return {
    title: game ? `Live Map — ${game.name}` : "Live Map",
    description:
      "Full-screen live map showing team positions, checkpoint routes, and the finish area in real time.",
  };
}

export default async function EventMapPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  const initialData = await getPublicMapData(game.id);
  return <PublicLiveMap initialData={initialData} eventSlug={slug} />;
}
