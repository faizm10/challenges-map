import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { allowAnonymousGameCreateFromEnv } from "@/lib/config";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create event",
  description:
    "Create your event URL, HQ PIN, and open the dashboard to add teams and challenges.",
};

export default async function CreateEventLayout({ children }: { children: ReactNode }) {
  if (!allowAnonymousGameCreateFromEnv()) {
    const session = await getSession();
    if (session?.role !== "admin") {
      redirect("/e/converge/admin");
    }
  }
  return children;
}
