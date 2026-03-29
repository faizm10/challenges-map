import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "HQ Admin",
  description:
    "HQ control room for Converge with challenge release, check-in review, live team progress, media verification, and scoring.",
};

export default function AdminPage() {
  redirect(`/e/${DEFAULT_DEV_GAME_SLUG}/admin`);
}
