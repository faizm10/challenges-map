import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-redirect";

import { OrganizerLoginClient } from "./organizer-login-client";

export const metadata: Metadata = {
  title: "Organizer log in",
  description: "Log in to create or manage challenge events.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function OrganizerLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <OrganizerLoginClient nextPath={safeNextPath(next)} />;
}
