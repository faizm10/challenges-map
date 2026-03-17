import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "HQ Admin",
  description:
    "HQ control room for Converge with challenge release, check-in review, live team progress, media verification, and scoring.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
