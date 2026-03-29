import type { Metadata } from "next";
import { SignupClient } from "@/app/signup/signup-client";

export const metadata: Metadata = {
  title: "Organizer Sign Up",
  description: "Create organizer credentials.",
};

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/e/create";
  return <SignupClient nextPath={nextPath} />;
}
