import Image from "next/image";
import localFont from "next/font/local";

import { cn } from "@/lib/utils";

const departureMono = localFont({
  src: "../fonts/DepartureMono-Regular.woff2",
  display: "swap",
  weight: "400",
});

const paperNoise =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const routeStops: Array<{
  caption: string;
  src: string;
  alt: string;
  className: string;
  rotate: number;
}> = [
  {
    caption: "Harbourfront",
    src: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=480&q=80",
    alt: "Toronto waterfront and lake view",
    className: "left-[2%] top-[58%] w-[min(38vw,200px)] sm:left-[4%] sm:top-[52%] sm:w-[200px]",
    rotate: -6,
  },
  {
    caption: "Kensington",
    src: "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=480&q=80",
    alt: "Busy Toronto street scene",
    className: "left-[18%] top-[28%] w-[min(36vw,190px)] sm:left-[22%] sm:top-[22%] sm:w-[190px]",
    rotate: 4,
  },
  {
    caption: "Union Station",
    src: "https://images.unsplash.com/photo-1517935706615-2717063cc922?w=480&q=80",
    alt: "Interior of a grand transit hall",
    className: "left-[38%] top-[62%] w-[min(40vw,210px)] sm:left-[40%] sm:top-[55%] sm:w-[210px]",
    rotate: -3,
  },
  {
    caption: "CN Tower",
    src: "https://images.unsplash.com/photo-1582282383183-7415fadca64d?w=480&q=80",
    alt: "CN Tower against the sky",
    className: "right-[8%] top-[12%] left-auto w-[min(36vw,185px)] sm:right-[12%] sm:top-[8%] sm:w-[185px]",
    rotate: 5,
  },
  {
    caption: "Financial District",
    src: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc4?w=480&q=80",
    alt: "Toronto skyline at dusk",
    className: "right-[4%] top-[48%] left-auto w-[min(38vw,200px)] sm:right-[6%] sm:top-[42%] sm:w-[200px]",
    rotate: -5,
  },
];

function Polaroid({
  caption,
  src,
  alt,
  className,
  rotate,
}: {
  caption: string;
  src: string;
  alt: string;
  className?: string;
  rotate?: number;
}) {
  return (
    <figure
      className={cn(
        "pointer-events-none z-20 bg-[#faf8f4] p-2.5 pb-3 shadow-[4px_8px_24px_rgba(62,39,35,0.18),0_1px_0_rgba(255,255,255,0.85)_inset]",
        className,
      )}
      style={{ transform: `rotate(${rotate ?? 0}deg)` }}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#e5e0d8]">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 40vw, 220px"
        />
      </div>
      <figcaption className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3E2723]/85">
        {caption}
      </figcaption>
    </figure>
  );
}

function RoutePathDecor({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-[#3A4D39]", className)}
      viewBox="0 0 1000 520"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <path
        d="M -20 420 C 120 380 200 120 340 200 S 520 380 620 260 S 780 80 1020 140"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="10 14"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M 40 100 C 180 160 260 400 480 360 S 720 200 980 280"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}

export function ScrapbookHome() {
  return (
    <div className={cn(departureMono.className, "min-h-dvh text-[#3E2723] antialiased")}>
      {/* Route */}
      <section className="relative border-b-10 border-[#3A4D39]">
        <div className="absolute inset-0 bg-[#F2EEE8]" />
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{ backgroundImage: paperNoise, backgroundSize: "128px 128px" }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#F2EEE8]/95 via-[#F2EEE8]/55 to-[#ebe4db]/90" />

        <div className="absolute inset-0">
          <Image
            src="/isometric-city-hero.png"
            alt=""
            fill
            className="object-cover opacity-[0.44]"
            style={{ objectPosition: "50% 58%" }}
            sizes="100vw"
            unoptimized
            aria-hidden
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-[#F2EEE8] via-transparent to-[#F2EEE8]/70" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          <h1
            className="text-4xl font-bold tracking-[0.02em] text-[#3E2723] sm:text-5xl md:text-6xl"
          >
            The route
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#3E2723]/78 sm:text-lg">
            Converge is a team city challenge across Toronto: four squads start from different corners
            of the city, hit live HQ drops, and fold every path toward one finish —{" "}
            <span className="font-semibold text-[#3E2723]">Union Station</span>.
          </p>

          <div className="relative mt-10 min-h-[min(72vh,560px)] sm:min-h-[520px]">
            <RoutePathDecor />
            {routeStops.map((stop) => (
              <Polaroid
                key={stop.caption}
                caption={stop.caption}
                src={stop.src}
                alt={stop.alt}
                className={cn("absolute", stop.className)}
                rotate={stop.rotate}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative min-h-dvh overflow-hidden bg-[#F2EEE8]">
        <div className="absolute inset-0 bg-[#F2EEE8]" />
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{ backgroundImage: paperNoise, backgroundSize: "128px 128px" }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-[#f7f3ee] via-[#F2EEE8]/78 to-[#ece4da]/92" />
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[#3A4D39]/10 via-[#F2EEE8]/70 to-transparent" />
        <div className="absolute inset-0">
          <Image
            src="/footer.png"
            alt=""
            fill
            className="object-cover object-bottom opacity-[0.82]"
            sizes="100vw"
            aria-hidden
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.94),rgba(242,238,232,0.6)_34%,rgba(242,238,232,0.12)_58%,transparent_78%)]" />
        <div className="absolute inset-0 bg-linear-to-t from-[#F2EEE8]/14 via-transparent to-[#F2EEE8]/9" />

        <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-[#3E2723]/10 bg-[#F7F3EE]/52 px-6 py-8 shadow-[0_20px_60px_rgba(62,39,35,0.08)] backdrop-blur-[2px] sm:px-10 sm:py-10">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#3E2723]/58">
              Converge
            </p>
            <h2 className="mt-5 text-4xl font-bold tracking-[0.02em] text-[#3E2723] sm:text-5xl md:text-6xl">
              End at the skyline.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[#3E2723]/76 sm:text-base md:text-lg">
              A Toronto city challenge built for teams who want the route, the rush, and the
              finish line to feel unforgettable.
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[#3E2723]/48">
              © 2026 Converge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
