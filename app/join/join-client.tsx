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
      setError("Enter a valid 6-digit game PIN from your organizer to join the game.");
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
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto lg:min-h-screen lg:flex-row">
      <div
        className="relative flex h-[clamp(180px,33dvh,320px)] flex-col justify-between p-[clamp(14px,2.6dvh,28px)] lg:min-h-screen lg:h-auto lg:w-[58%] lg:p-14"
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

        <div className="relative z-10 space-y-2 lg:space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ffd8b7]">Team Entry</p>
          <h1 className="text-[clamp(2.1rem,8vw,3.75rem)] leading-[0.95] text-[#e6d5b8]">
            Enter
            <br />
            the race.
          </h1>
          <p className="max-w-xs text-xs leading-5 text-[#e6d5b8]/58 lg:text-sm lg:leading-6">
            Use your organizer&apos;s 6-digit game PIN to access game sign-in and start your city run.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-start bg-[#090809] px-[clamp(14px,4vw,28px)] py-[clamp(14px,2.4dvh,26px)] lg:justify-center lg:px-14 lg:py-14">
        <div className="w-full max-w-[420px] space-y-[clamp(14px,2.1dvh,28px)]">
          <div className="space-y-1 border-l-2 border-[#f2c39b] pl-3 lg:pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[#f2c39b]">Join</p>
            <h2 className="text-[clamp(1.9rem,7vw,2.5rem)] leading-none text-[#e6d5b8]">Game PIN</h2>
            <p className="text-xs text-[#e6d5b8]/42">
              Enter the 6-digit PIN from your organizer to join the game.
            </p>
          </div>

          <Card className="border border-[#e6d5b8]/10 bg-[#0f0c0d]">
            <CardContent className="space-y-4 p-4 lg:space-y-6 lg:p-6">
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
                  className="grid w-full grid-cols-6 gap-1.5 lg:gap-2"
                  onClick={() => pinInputRef.current?.focus()}
                >
                  {[...Array(6)].map((_, index) => {
                    const digit = eventPin[index] ?? "";
                    const active = eventPin.length === index || (eventPin.length === 6 && index === 5);
                    return (
                      <span
                        key={index}
                        className={`flex h-10 items-center justify-center border text-base lg:h-12 lg:text-lg ${
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
                {loading ? "Checking PIN..." : "Sign in to Game"}
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
