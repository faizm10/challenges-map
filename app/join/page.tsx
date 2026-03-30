import type { Metadata } from "next";

import { JoinClient } from "./join-client";

export const metadata: Metadata = {
  title: "Join your game",
  description: "Enter your 6-digit event PIN to continue to team sign in.",
};

export default function JoinPage() {
  return <JoinClient />;
}
