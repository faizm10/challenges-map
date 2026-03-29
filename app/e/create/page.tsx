"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CreateEventPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [finishPointLabel, setFinishPointLabel] = useState("");
  const [finishShortName, setFinishShortName] = useState("");
  const [finishLatitude, setFinishLatitude] = useState("");
  const [finishLongitude, setFinishLongitude] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const latParsed = finishLatitude.trim() === "" ? null : Number(finishLatitude);
      const lngParsed = finishLongitude.trim() === "" ? null : Number(finishLongitude);
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          adminDisplayName: adminDisplayName.trim(),
          adminPin: adminPin.trim(),
          ...(finishPointLabel.trim()
            ? { finishPointLabel: finishPointLabel.trim() }
            : {}),
          ...(finishShortName.trim() ? { finishShortName: finishShortName.trim() } : {}),
          ...(latParsed !== null && Number.isFinite(latParsed) ? { finishLatitude: latParsed } : {}),
          ...(lngParsed !== null && Number.isFinite(lngParsed) ? { finishLongitude: lngParsed } : {}),
        }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create event.");
        return;
      }
      if (data.slug) {
        router.push(`/e/${data.slug}/admin`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card className="border-2 border-foreground bg-card">
        <CardHeader>
          <CardTitle className="font-pixel text-lg uppercase">Create your event</CardTitle>
          <CardDescription>
            Set the public URL, event title, and HQ credentials you will use at this event&apos;s admin
            page. Add teams and challenges next from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="slug">
                Event URL (slug)
              </label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="shrink-0">/e/</span>
                <Input
                  id="slug"
                  className="font-mono text-sm"
                  autoComplete="off"
                  placeholder="my-race-2026"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="name">
                Event display name
              </label>
              <Input
                id="name"
                placeholder="Spring city challenge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="adminName">
                Admin display name
              </label>
              <Input
                id="adminName"
                placeholder="HQ"
                value={adminDisplayName}
                onChange={(e) => setAdminDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="adminPin">
                Admin PIN
              </label>
              <Input
                id="adminPin"
                type="password"
                autoComplete="new-password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">Finish line (optional)</p>
              <p className="text-xs text-muted-foreground/90">
                Defaults to the downtown reference finish if you skip this. You can change it anytime in HQ.
              </p>
              <Input
                className="text-sm"
                placeholder="Address or description"
                value={finishPointLabel}
                onChange={(e) => setFinishPointLabel(e.target.value)}
              />
              <Input
                className="text-sm"
                placeholder="Short label for maps"
                value={finishShortName}
                onChange={(e) => setFinishShortName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="font-mono text-sm"
                  inputMode="decimal"
                  placeholder="Latitude"
                  value={finishLatitude}
                  onChange={(e) => setFinishLatitude(e.target.value)}
                />
                <Input
                  className="font-mono text-sm"
                  inputMode="decimal"
                  placeholder="Longitude"
                  value={finishLongitude}
                  onChange={(e) => setFinishLongitude(e.target.value)}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button className="font-pixel uppercase" disabled={loading} type="submit">
                {loading ? "Creating…" : "Create & open HQ"}
              </Button>
              <Button asChild type="button" variant="secondary">
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
