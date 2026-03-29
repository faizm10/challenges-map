import type { Metadata } from "next";
import { OrganizerLoginClient } from "@/app/organizer/login/organizer-login-client";

export const metadata: Metadata = {
  title: "Organizer Sign In",
  description: "Sign in with organizer credentials.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function OrganizerLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/e/admin";
  return <OrganizerLoginClient nextPath={nextPath} />;
}
