import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { allowAnonymousGameCreateFromEnv } from "@/lib/config";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "HQ events",
  description: "Open HQ for an event or create a new one.",
};

export default async function AdminHubLayout({ children }: { children: ReactNode }) {
  if (!allowAnonymousGameCreateFromEnv()) {
    const session = await getSession();
    if (session?.role !== "admin") {
      redirect("/e/converge/admin");
    }
  }
  return children;
}
