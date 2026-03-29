import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Map",
  description:
    "Full-screen live map for Converge showing team positions, checkpoint routes, and Union Station in real time.",
};

export default function MapPage() {
  redirect(`/e/${DEFAULT_DEV_GAME_SLUG}/map`);
}
