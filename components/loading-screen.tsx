type LoadingScreenProps = {
  label: string;
  description?: string;
};

export function LoadingScreen({ label, description }: LoadingScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(216,95,58,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.04),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

      <div className="glass-panel relative z-10 w-full max-w-md rounded-[32px] px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
          <span className="inline-flex h-2 w-2 rounded-full bg-orange-300/90 animate-pulse" />
          Converge
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <div className="relative h-7 w-7">
            <span className="absolute inset-0 rounded-full border-2 border-orange-300/25" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-300 animate-spin" />
          </div>
        </div>

        <h1 className="font-serif text-3xl leading-tight text-white sm:text-4xl">{label}</h1>
        {description ? (
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-white/58 sm:text-base">
            {description}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/35 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/35 animate-pulse [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/35 animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </main>
  );
}
