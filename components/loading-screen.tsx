type LoadingScreenProps = {
  label: string;
  description?: string;
};

export function LoadingScreen({ label, description }: LoadingScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pixel-panel relative z-10 w-full max-w-md px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mb-5 inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-3 py-1.5 font-pixel text-[8px] uppercase text-secondary-foreground">
          <span className="inline-flex h-2 w-2 bg-foreground animate-pulse" />
          Converge
        </div>

        {/* Pixel loading animation */}
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center border-2 border-foreground bg-gb-lightest">
          <div className="grid grid-cols-2 gap-0.5">
            <span className="h-2 w-2 bg-foreground animate-pulse" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:150ms]" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:300ms]" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:450ms]" />
          </div>
        </div>

        <h1 className="font-pixel text-sm uppercase leading-relaxed text-foreground">{label}</h1>
        {description ? (
          <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}

        {/* Pixel loading dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <span className="h-2 w-2 bg-foreground animate-pulse" />
          <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:120ms]" />
          <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </main>
  );
}
