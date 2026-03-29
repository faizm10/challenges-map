"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_DEV_GAME_SLUG } from "@/lib/config";
import { isValidEventSlug, normalizeEventSlug } from "@/lib/event-slug";

export function JoinClient({ defaultSlug }: { defaultSlug: string }) {
  const router = useRouter();
  const [slugInput, setSlugInput] = useState(defaultSlug);
  const [error, setError] = useState("");

  function go(path: "team" | "admin") {
    setError("");
    const s = normalizeEventSlug(slugInput);
    if (!isValidEventSlug(s)) {
      setError(
        "Enter a valid event link (3–50 characters: lowercase letters, numbers, hyphens, no leading or trailing hyphen)."
      );
      return;
    }
    router.push(`/e/${s}/${path}`);
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card className="border-2 border-foreground bg-card">
        <CardHeader>
          <CardTitle className="font-pixel text-lg uppercase">Join your event</CardTitle>
          <CardDescription>
            Use the event link your organizer shared (the part after{" "}
            <span className="font-mono text-[10px]">/e/</span>
            ). Then open the team or HQ page for that event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="join-slug">
              Event link
            </label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0 font-mono text-[10px]">/e/</span>
              <Input
                id="join-slug"
                className="font-mono text-sm"
                autoComplete="off"
                placeholder={DEFAULT_DEV_GAME_SLUG}
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="font-pixel uppercase"
              type="button"
              variant="secondary"
              onClick={() => go("team")}
            >
              Team sign in
            </Button>
            <Button className="font-pixel uppercase" type="button" onClick={() => go("admin")}>
              HQ / Admin
            </Button>
          </div>

          <div className="border-t border-border pt-6">
            <p className="font-pixel text-[9px] uppercase tracking-wider text-muted-foreground">
              Hosting an event?
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Create an organizer account, set your event URL, then share the link with teams.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/signup">Host — sign up</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/organizer/login?next=%2Fe%2Fcreate">Organizer log in</Link>
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link className="underline underline-offset-4" href="/">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
