import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type ServiceAreaSectionProps = {
  serviceArea?: string;
  isVerified: boolean;
};

function getPublishedAreaItems(serviceArea: string) {
  const items = serviceArea
    .split(/\s*(?:;|\||•|\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items.slice(0, 8) : [];
}

export function ServiceAreaSection({ serviceArea, isVerified }: ServiceAreaSectionProps) {
  const publishedArea = serviceArea?.trim() || "";
  const areaItems = isVerified ? getPublishedAreaItems(publishedArea) : [];
  const mapLabel = isVerified
    ? `Illustrative map for ${publishedArea}. The highlighted area is a visual guide and is not drawn to scale.`
    : "Illustrative service-area preview. The business has not published a verified coverage boundary.";

  return (
    <section
      id="service-area"
      data-cc-section="service-area"
      data-cc-label="Service Area"
      className="scroll-mt-[112px] border-b bg-muted/20 py-[var(--phi-section)]"
      aria-labelledby="service-area-title"
    >
      <div className="phi-container">
        <div className="mx-auto mb-[var(--phi-space-6)] max-w-3xl text-center reveal-on-scroll">
          <p className="phi-eyebrow mb-3 text-primary">Service area</p>
          <h2 id="service-area-title" className="phi-section-title mx-auto">
            Where I Work
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {isVerified
              ? publishedArea
              : "The business has not published a verified service area yet."}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isVerified
              ? "Coverage is reviewed by the business when you send a service request."
              : "This preview keeps coverage details general until the business supplies and verifies them."}
          </p>
        </div>

        <div className="grid items-stretch gap-[var(--phi-space-4)] lg:grid-cols-[1.2fr_0.8fr]">
          <div
            className="relative min-h-[22rem] overflow-hidden rounded-[var(--phi-radius)] border border-slate-300 bg-[#dfe8df] shadow-sm sm:min-h-[28rem] dark:border-slate-700 dark:bg-slate-800"
            role="img"
            aria-label={mapLabel}
          >
            <svg
              viewBox="0 0 900 560"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="service-area-grid" width="72" height="72" patternUnits="userSpaceOnUse">
                  <path d="M 72 0 L 0 0 0 72" fill="none" stroke="#b4c4b4" strokeWidth="1" opacity="0.45" />
                  <path d="M 0 48 C 26 38 38 58 72 43" fill="none" stroke="#f4f7f1" strokeWidth="7" opacity="0.85" />
                </pattern>
                <linearGradient id="service-area-wash" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#eef3ec" />
                  <stop offset="1" stopColor="#cdddcf" />
                </linearGradient>
              </defs>
              <rect width="900" height="560" fill="url(#service-area-wash)" />
              <rect width="900" height="560" fill="url(#service-area-grid)" />
              <path
                d="M-40 430 C 110 345 136 380 250 306 S 418 220 488 275 S 660 370 944 160"
                fill="none"
                stroke="#f9faf7"
                strokeWidth="24"
                opacity="0.95"
              />
              <path
                d="M-40 430 C 110 345 136 380 250 306 S 418 220 488 275 S 660 370 944 160"
                fill="none"
                stroke="#a8b7ae"
                strokeWidth="2"
                strokeDasharray="10 9"
              />
              <path
                d="M120 35 C 260 180 285 190 350 294 S 510 480 780 590"
                fill="none"
                stroke="#f6f8f2"
                strokeWidth="14"
                opacity="0.9"
              />
              <path
                d="M120 35 C 260 180 285 190 350 294 S 510 480 780 590"
                fill="none"
                stroke="#b8c6bd"
                strokeWidth="2"
                strokeDasharray="8 10"
              />
              <path d="M660 0 C 584 96 615 168 740 208 S 820 386 690 560" fill="none" stroke="#bdd1bc" strokeWidth="30" opacity="0.45" />
              <path d="M40 122 C 180 86 284 112 408 56" fill="none" stroke="#a9c5a5" strokeWidth="22" opacity="0.35" />
            </svg>

            <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-6">
              <div className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200">
                {isVerified ? "Published area" : "Coverage preview"}
              </div>
              <div className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-300">
                {isVerified ? "Visual guide" : "Not to scale"}
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex h-[min(70vw,21rem)] w-[min(70vw,21rem)] max-h-[75%] max-w-[75%] items-center justify-center rounded-full border-2 border-primary/75 bg-primary/10 shadow-[0_0_0_14px_rgba(234,88,12,0.08)]">
                <div className="absolute inset-[14%] rounded-full border border-dashed border-primary/45" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-primary text-primary-foreground shadow-xl sm:h-14 sm:w-14">
                  <MapPin className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                </div>
                <span className="absolute -top-10 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  {isVerified ? "Service area" : "Preview center"}
                </span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 max-w-[15rem] rounded-xl border border-white/70 bg-white/85 px-3 py-2 text-xs leading-5 text-slate-600 shadow-sm backdrop-blur-sm sm:bottom-6 sm:left-6 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-300">
              {isVerified
                ? "Coverage boundaries are reviewed when the business confirms your request."
                : "A map boundary and community list will appear only after verification."}
            </div>
          </div>

          <div className="phi-card flex flex-col border bg-card p-[var(--phi-space-4)] shadow-sm sm:p-[var(--phi-space-5)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold">
                  {isVerified ? "Communities served" : "Coverage details"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {isVerified
                    ? "The published service-area description from the business."
                    : "Service-area information is intentionally limited in this preview."}
                </p>
              </div>
            </div>

            {isVerified && areaItems.length > 0 ? (
              <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {areaItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm font-semibold text-foreground/80">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-7 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  Awaiting business verification
                </div>
                The business can publish a service-area description after its identity and coverage details are verified.
              </div>
            )}

            <div className="mt-auto border-t border-border/70 pt-6">
              <p className="text-sm leading-6 text-muted-foreground">
                Have a garage-door issue or a location question? Send a request and the business can confirm coverage and timing.
              </p>
              <Button asChild className="mt-5 w-full font-display font-bold shadow-md sm:w-auto">
                <a href="#booking">
                  Ask about availability
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}