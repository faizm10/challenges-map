type LoadingScreenProps = {
  label: string;
  description?: string;
};

export function LoadingScreen({ label, description }: LoadingScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-3 py-6 text-foreground sm:px-4 sm:py-10">
      <div className="pixel-panel relative z-10 w-full max-w-md px-4 py-6 text-center sm:px-8 sm:py-10">
        <div className="mb-4 inline-flex items-center gap-2 border-2 border-foreground bg-secondary px-3 py-1.5 font-pixel text-[8px] uppercase text-secondary-foreground sm:mb-5">
          <span className="inline-flex h-2 w-2 bg-foreground animate-pulse" />
          Converge
        </div>

        {/* Pixel loading animation */}
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center border-2 border-foreground bg-gb-lightest sm:mb-6 sm:h-12 sm:w-12">
          <div className="grid grid-cols-2 gap-0.5">
            <span className="h-2 w-2 bg-foreground animate-pulse" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:150ms]" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:300ms]" />
            <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:450ms]" />
          </div>
        </div>

        <h1 className="font-pixel text-xs uppercase leading-relaxed text-foreground sm:text-sm">{label}</h1>
        {description ? (
          <p className="mx-auto mt-3 max-w-[19rem] text-[11px] leading-5 text-muted-foreground sm:mt-4 sm:max-w-sm sm:text-xs">
            {description}
          </p>
        ) : null}

        {/* Pixel loading dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-6">
          <span className="h-2 w-2 bg-foreground animate-pulse" />
          <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:120ms]" />
          <span className="h-2 w-2 bg-foreground animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </main>
  );
}
