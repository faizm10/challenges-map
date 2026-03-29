import type { Metadata } from "next";

import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";

import { JoinClient } from "./join-client";

export const metadata: Metadata = {
  title: "Join your event",
  description: "Enter your event link to sign in as a team or open HQ for that event.",
};

export default function JoinPage() {
  return <JoinClient defaultSlug={DEFAULT_DEV_GAME_SLUG} />;
}
