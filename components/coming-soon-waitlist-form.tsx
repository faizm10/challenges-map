"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";

export function ComingSoonWaitlistForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Email required", description: "Add your email to join the list.", variant: "error" });
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string }
        | null;

      if (!response.ok) {
        toast({
          title: "Could not sign up",
          description: data?.error ?? "Please try again in a moment.",
          variant: "error",
        });
        return;
      }

      toast({
        title: "You're on the list",
        description: data?.message,
        variant: "success",
      });
      setEmail("");
    } catch {
      toast({
        title: "Network error",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-stretch" onSubmit={onSubmit}>
      <Input
        autoComplete="email"
        className="h-12 flex-1 rounded-2xl border-white/15 bg-white/5 text-white placeholder:text-white/35 focus-visible:ring-orange-400/50"
        name="email"
        onChange={(ev) => setEmail(ev.target.value)}
        placeholder="you@example.com"
        type="email"
        value={email}
      />
      <Button
        className="h-12 shrink-0 rounded-2xl bg-orange-500 px-8 font-semibold text-black hover:bg-orange-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Joining…" : "Join waitlist"}
      </Button>
    </form>
  );
}
