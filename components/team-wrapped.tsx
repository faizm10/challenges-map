import type { CSSProperties } from "react";

import { Camera, MapPinned, Sparkles, Star } from "lucide-react";

type WrappedPhoto = {
  key: string;
  signedUrl: string;
  fileName: string;
  uploadedAt: string;
  challengeOrder: number;
  challengeTitle: string;
};

type TeamWrappedProps = {
  eventName: string;
  teamName: string;
  teamColor: string;
  totalPoints: number;
  photos: WrappedPhoto[];
};

const PHOTO_ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4] as const;
const PHOTO_OFFSETS = ["mt-0", "mt-6", "mt-2", "mt-10", "mt-4", "mt-8", "mt-1", "mt-7"] as const;

function formatUploadTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Captured recently";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).format(parsed);
}

function sanitizeColor(value: string) {
  const trimmed = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : "#f97316";
}

export function TeamWrapped({
  eventName,
  teamName,
  teamColor,
  totalPoints,
  photos,
}: TeamWrappedProps) {
  const accentColor = sanitizeColor(teamColor);
  const missionCount = new Set(photos.map((photo) => photo.challengeOrder)).size;
  const latestMoment = photos[0] ? formatUploadTime(photos[0].uploadedAt) : "No uploads yet";

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#07070a] bg-center bg-no-repeat text-[#f7f0df]"
      style={
        {
          "--wrapped-accent": accentColor,
          backgroundImage: "url('/wrapped.png')",
          backgroundPosition: "center 20%",
          backgroundSize: "min(1000px, calc(100vw - 2.5rem)) auto",
        } as CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#050507]/62" />
        <div className="absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-[var(--wrapped-accent)]/18 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-[#f97316]/18 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-[#ffe08a]/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_34%),linear-gradient(140deg,_rgba(12,11,16,0.15),_rgba(12,11,16,0.68)_55%,_rgba(12,11,16,0.9))]" />
        <div className="absolute inset-0 opacity-18 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8 md:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 border border-white/10 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.32em] text-[#f7f0df]/65 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--wrapped-accent)]" />
              Team Wrapped
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.34em] text-[#f7f0df]/45">{eventName}</p>
              <h1 className="max-w-4xl text-5xl leading-[0.9] font-pixel sm:text-6xl md:text-7xl lg:text-8xl">
                {teamName}
                <span className="mt-2 block text-[var(--wrapped-accent)]">captured the hunt.</span>
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[#f7f0df]/62 sm:text-base">
                A late-night scrapbook of every photo your team locked in across the challenge run.
                Instant-film cards, mission stamps, and the full proof trail in one place.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden border border-white/12 bg-white/6 p-5 backdrop-blur-sm sm:p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,var(--wrapped-accent),#f97316,transparent)]" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#f7f0df]/45">
                  <Camera className="h-3.5 w-3.5 text-[var(--wrapped-accent)]" />
                  Moments
                </div>
                <p className="mt-3 text-3xl text-[#fff7e3] sm:text-4xl">{photos.length}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#f7f0df]/45">
                  <MapPinned className="h-3.5 w-3.5 text-[#f97316]" />
                  Missions
                </div>
                <p className="mt-3 text-3xl text-[#fff7e3] sm:text-4xl">{missionCount}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[#f7f0df]/45">
                  <Star className="h-3.5 w-3.5 text-[#ffe08a]" />
                  Points
                </div>
                <p className="mt-3 text-3xl text-[#fff7e3] sm:text-4xl">{totalPoints}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#f7f0df]/45">Latest shot</p>
                <p className="mt-3 text-base leading-5 text-[#fff7e3] sm:text-lg">{latestMoment}</p>
              </div>
            </div>
          </div>
        </div>

        {photos.length ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#f7f0df]/45">Photo archive</p>
                <h2 className="mt-2 text-2xl text-[#fff7e3] sm:text-3xl">Every image card from the route</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[#f7f0df]/55">
                Photos only for now. Video uploads stay out of the wall so the page reads like a clean
                printed recap.
              </p>
            </div>

            <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
              {photos.map((photo, index) => {
                const rotation = PHOTO_ROTATIONS[index % PHOTO_ROTATIONS.length];
                const offsetClass = PHOTO_OFFSETS[index % PHOTO_OFFSETS.length];

                return (
                  <article
                    key={photo.key}
                    className={`group ${offsetClass} mb-6 break-inside-avoid border border-[#ddd2bd] bg-[#f8f2e7] p-3 text-[#1b1513] shadow-[0_24px_50px_rgba(0,0,0,0.35)] transition duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)]`}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      animation: `wrapped-card-rise 650ms cubic-bezier(0.22, 1, 0.36, 1) both`,
                      animationDelay: `${index * 70}ms`,
                    }}
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#d8d2ca] shadow-[inset_0_0_0_1px_rgba(27,21,19,0.08)]">
                      <img
                        alt={`${photo.challengeTitle} upload`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                        decoding="async"
                        src={photo.signedUrl}
                        style={{ imageRendering: "auto" }}
                        title={photo.fileName}
                      />
                    </div>

                    <div className="space-y-3 px-1 pb-1 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#6f6254]">
                          Mission {photo.challengeOrder}
                        </p>
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: accentColor }}
                        />
                      </div>
                      <div>
                        <p className="line-clamp-2 text-sm leading-5 text-[#1b1513]">{photo.challengeTitle}</p>
                        <p className="mt-2 text-xs text-[#6f6254]">{formatUploadTime(photo.uploadedAt)}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden border border-dashed border-white/14 bg-white/5 px-6 py-14 text-center backdrop-blur-sm sm:px-10">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]" />
            <p className="text-xs uppercase tracking-[0.34em] text-[#f7f0df]/45">No photos yet</p>
            <h2 className="mt-4 text-3xl text-[#fff7e3] sm:text-4xl">This scrapbook is waiting on its first print.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#f7f0df]/58 sm:text-base">
              Once your team uploads image proof to challenge cards, they will land here as instant-film
              moments. Videos are intentionally skipped on this version of the page.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
