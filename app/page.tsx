import type { Metadata } from "next";

import { ScrapbookHome } from "@/components/scrapbook-home";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Converge",
  description:
    "Converge is a Toronto team city challenge where squads move through the city, complete live HQ drops, and converge at Union.",
};

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#F2EEE8]">
      <ScrapbookHome />
    </main>
  );
}
