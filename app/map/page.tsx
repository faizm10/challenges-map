import type { Metadata } from "next";

import { PublicLiveMap } from "@/components/public-live-map";
import { getPublicMapData } from "@/lib/game";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Map",
  description:
    "Full-screen live map for Converge showing team positions, checkpoint routes, and Union Station in real time.",
};

export default async function MapPage() {
  const initialData = await getPublicMapData();
  return <PublicLiveMap initialData={initialData} />;
}
