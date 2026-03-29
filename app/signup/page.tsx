import type { Metadata } from "next";

import { safeNextPath } from "@/lib/safe-redirect";

import { SignupClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Sign up — organizer",
  description: "Create an organizer account to set up a multi-team challenge event.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <SignupClient nextPath={safeNextPath(next)} />;
}
