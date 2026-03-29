import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Host",
  description: "Redirect to organizer sign up or sign in.",
};

type Props = { searchParams: Promise<{ next?: string; mode?: string }> };

export default async function HostPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/e/create";
  if (params.mode === "login") {
    redirect(`/organizer/login?next=${encodeURIComponent(nextPath)}`);
  }
  redirect(`/signup?next=${encodeURIComponent(nextPath)}`);
}
