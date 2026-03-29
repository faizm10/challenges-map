import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Organizer log in",
  description: "Log in to create or manage challenge events.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function OrganizerLoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  redirect(
    `/host?mode=login&next=${encodeURIComponent(safeNextPath(next))}`
  );
}
