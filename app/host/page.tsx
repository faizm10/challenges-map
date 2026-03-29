import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-redirect";

import { HostClient } from "./host-client";

export const metadata: Metadata = {
  title: "Host — organizer",
  description: "Sign up or log in to host and manage your event.",
};

type Props = { searchParams: Promise<{ next?: string; mode?: string }> };

export default async function HostPage({ searchParams }: Props) {
  const { next, mode } = await searchParams;
  const nextPath = safeNextPath(next);
  const initialMode = mode === "login" ? "login" : "signup";

  return <HostClient nextPath={nextPath} initialMode={initialMode} />;
}
