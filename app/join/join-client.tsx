"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function JoinClient() {
  const router = useRouter();
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [eventPin, setEventPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function goTeam() {
    setError("");

    if (!/^\d{6}$/.test(eventPin)) {
      setError("Enter a valid 6-digit event PIN from your organizer.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/public/resolve-event-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: eventPin }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        slug?: string;
        error?: string;
      };

      if (!response.ok || !data.slug) {
        setError(data.error ?? "Unable to find event for this PIN.");
        return;
      }

      router.push(`/e/${data.slug}/team`);
    } catch {
      setError("Unable to connect right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <Card className="border-2 border-foreground bg-card">
        <CardHeader>
          <CardTitle className="font-pixel text-lg uppercase">Join your event</CardTitle>
          <CardDescription>
            Enter the 6-digit event PIN from your organizer, then continue to team sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="event-pin">
              Event PIN
            </label>
            <input
              id="event-pin"
              ref={pinInputRef}
              className="sr-only"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              value={eventPin}
              onChange={(e) => setEventPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              type="button"
              className="grid w-full grid-cols-6 gap-2"
              onClick={() => pinInputRef.current?.focus()}
            >
              {[...Array(6)].map((_, index) => {
                const digit = eventPin[index] ?? "";
                const active = eventPin.length === index || (eventPin.length === 6 && index === 5);
                return (
                  <span
                    key={index}
                    className={`flex h-12 items-center justify-center border-2 text-lg ${
                      active
                        ? "border-primary bg-[#e6d3b5] text-[#5a3c2a]"
                        : "border-foreground bg-card text-foreground"
                    }`}
                  >
                    {digit || "•"}
                  </span>
                );
              })}
            </button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <Button
            className="w-full font-pixel uppercase"
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={goTeam}
          >
            {loading ? "Checking PIN..." : "Team sign in"}
          </Button>

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
