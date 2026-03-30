import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSignin } from "@/components/admin-signin";
import { getGameBySlug } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return {
    title: game ? `HQ Sign In — ${game.name}` : "HQ Sign In",
    description: "Sign in to access HQ admin controls.",
  };
}

export default async function AdminSigninPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  return <AdminSignin gameSlug={slug} />;
}
