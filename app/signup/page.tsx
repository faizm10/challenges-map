import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign up — organizer",
  description: "Create an organizer account to set up a multi-team challenge event.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams;
  redirect(
    `/host?mode=signup&next=${encodeURIComponent(safeNextPath(next))}`
  );
}
