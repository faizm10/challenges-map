"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrganizerLoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/organizer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to continue.");
        return;
      }
      router.push(nextPath);
      router.refresh();
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
            "url('/images/landing/u1194229659_generate_a_pixel_gamified_toronto_landscape_pictu_415a8841-0d4c-4e47-b833-4cfe0a3dc69a_3.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#090809]/68 via-[#090809]/30 to-[#090809]/84" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#090809]/62 lg:to-[#090809]" />
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.35em] text-orange-500">Converge</p>
        </div>
        <div className="relative z-10 space-y-2 lg:space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-orange-400">Organizer Access</p>
          <h1 className="text-[clamp(2.1rem,8vw,3.75rem)] leading-[0.95] text-[#e6d5b8]">
            Run
            <br />
            HQ command.
          </h1>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-start bg-[#090809] px-[clamp(14px,4vw,28px)] py-[clamp(14px,2.4dvh,26px)] lg:justify-center lg:px-14 lg:py-14">
        <div className="w-full max-w-[420px] space-y-[clamp(14px,2.1dvh,28px)]">
          <div className="space-y-1 border-l-2 border-orange-500 pl-3 lg:pl-4">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-500">Organizer Sign In</p>
            <h2 className="text-[clamp(1.9rem,7vw,2.5rem)] leading-none text-[#e6d5b8]">Welcome back</h2>
          </div>

          <form className="space-y-[clamp(12px,1.9dvh,20px)]" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">
                Organizer Name
              </label>
              <Input
                className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 text-[#e6d5b8] placeholder:text-[#e6d5b8]/22 focus:border-orange-500 focus:ring-0"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Faiz & Adelynn"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-widest text-[#e6d5b8]/45">PIN</label>
              <Input
                className="border border-[#e6d5b8]/12 bg-[#e6d5b8]/4 tracking-widest text-[#e6d5b8] placeholder:text-[#e6d5b8]/22 focus:border-orange-500 focus:ring-0"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            {error ? (
              <div className="border-l-2 border-red-500 bg-red-500/10 px-3 py-2">
                <p className="text-xs text-red-300">{error}</p>
              </div>
            ) : null}
            <Button
              className="w-full border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 hover:border-orange-400 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Working...
                </span>
              ) : (
                "Continue"
              )}
            </Button>
            <Button asChild className="w-full" type="button" variant="secondary">
              <Link href="/">Cancel</Link>
            </Button>
            <p className="text-center text-xs text-[#e6d5b8]/60 lg:text-sm">
              Need an account?{" "}
              <Link className="underline underline-offset-4 hover:text-[#e6d5b8]" href="/signup?next=%2Fe%2Fadmin">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
