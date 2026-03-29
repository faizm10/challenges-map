"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function JoinClient() {
  const router = useRouter();
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [eventPin, setEventPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function goTeam() {
    setError("");

    if (!/^\d{6}$/.test(eventPin)) {
      setError("Enter a valid 6-digit game PIN from your organizer.");
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
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row">
      <div
        className="relative flex min-h-[40vh] flex-col justify-between p-8 lg:min-h-screen lg:w-[58%] lg:p-14"
        style={{
          backgroundImage:
            "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_208a8505-04d8-407f-a202-6ea78d2f3571_3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/64 via-[#090809]/26 to-[#090809]/82" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090809]/58 lg:to-[#090809]" />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#f2c39b]">Converge</p>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ffd8b7]">Team Entry</p>
          <h1 className="text-4xl leading-tight text-[#e6d5b8] sm:text-5xl lg:text-6xl">
            Enter
            <br />
            the race.
          </h1>
          <p className="max-w-xs text-sm leading-6 text-[#e6d5b8]/58">
            Use your organizer&apos;s 6-digit game PIN to access team sign-in and start your city run.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#090809] px-8 py-14 lg:px-14">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="space-y-1 border-l-2 border-[#f2c39b] pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[#f2c39b]">Join</p>
            <h2 className="text-3xl text-[#e6d5b8]">Game PIN</h2>
            <p className="text-xs text-[#e6d5b8]/42">
              Enter the 6-digit PIN from your organizer.
            </p>
          </div>

          <Card className="border border-[#e6d5b8]/10 bg-[#0f0c0d]">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                
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
                        className={`flex h-12 items-center justify-center border text-lg ${
                          active
                            ? "border-[#f2c39b] bg-[#e6d3b5] text-[#5a3c2a]"
                            : "border-[#e6d5b8]/20 bg-[#e6d5b8]/5 text-[#e6d5b8]"
                        }`}
                      >
                        {digit || "•"}
                      </span>
                    );
                  })}
                </button>
                {error ? (
                  <div className="border-l-2 border-red-500 bg-red-500/8 px-3 py-2">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                ) : null}
              </div>

              <Button
                className="w-full border border-[#f2c39b] bg-[#f2c39b] text-[#1a130f] hover:border-[#ffd9ba] hover:bg-[#ffd9ba] disabled:opacity-50"
                type="button"
                disabled={loading}
                onClick={goTeam}
              >
                {loading ? "Checking PIN..." : "Team sign in"}
              </Button>
              
                            <Button asChild className="w-full" type="button" variant="secondary">
                              <Link href="/">Cancel</Link>
                            </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
