import { useEffect, useRef, useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEMES } from "@/lib/theme-options";

export function ThemeSwatch() {
  const { theme: activeTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={panelRef} className="fixed bottom-24 right-4 z-[60] sm:right-6">
      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose a website theme"
          className="absolute bottom-14 right-0 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border bg-card p-3 text-card-foreground shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b pb-3">
            <div>
              <p className="text-sm font-bold">Choose a business style</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Preview the customer website instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close theme picker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-1.5">
            {THEMES.map((option) => {
              const isSelected = activeTheme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-muted/60"
                  }`}
                >
                  <span
                    className="flex shrink-0 gap-0.5 rounded-full border border-black/10 bg-background p-1 shadow-sm"
                    aria-hidden="true"
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: option.preview.primary }} />
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: option.preview.secondary }} />
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: option.preview.accent }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{option.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{option.desc}</span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close theme picker" : "Open theme picker"}
        title="Preview website themes"
        className="flex h-11 w-11 items-center justify-center rounded-full border bg-background text-foreground shadow-lg transition-transform hover:scale-105 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Palette className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}