/**
 * AppearancePicker — floating bottom-right panel for theme, mode, and font.
 * Visible on public pages only (not mounted on admin routes).
 *
 * State is driven from the DOM (<html> data-theme / data-font / .dark), which
 * is the single source of truth. We listen to the APPEARANCE_CHANGED_EVENT
 * custom event to stay in sync with async site-default loads.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Palette } from 'lucide-react';
import {
  applyUserAppearance,
  readAppearanceFromDOM,
  APPEARANCE_CHANGED_EVENT,
  THEMES,
  FONTS,
  type ThemeId,
  type ThemeMode,
  type FontId,
  type AppearanceDetail,
} from '@/lib/appearance';
import { cn } from '@/lib/utils';

export function AppearancePicker() {
  const [open, setOpen]       = useState(false);
  const [appearance, setAppearance] = useState<AppearanceDetail>(() => readAppearanceFromDOM());
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // Keep picker in sync when the DOM changes (e.g. after server default loads)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AppearanceDetail>).detail;
      setAppearance(detail);
    };
    document.documentElement.addEventListener(APPEARANCE_CHANGED_EVENT, handler);
    // Sync once on mount in case an event fired before we were mounted
    setAppearance(readAppearanceFromDOM());
    return () => document.documentElement.removeEventListener(APPEARANCE_CHANGED_EVENT, handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // User-driven changes: apply + persist to localStorage
  const handleTheme = useCallback((id: ThemeId) => {
    applyUserAppearance(id, appearance.mode, appearance.fontId);
  }, [appearance.mode, appearance.fontId]);

  const handleMode = useCallback((m: ThemeMode) => {
    applyUserAppearance(appearance.themeId, m, appearance.fontId);
  }, [appearance.themeId, appearance.fontId]);

  const handleFont = useCallback((id: FontId) => {
    applyUserAppearance(appearance.themeId, appearance.mode, id);
  }, [appearance.themeId, appearance.mode]);

  const { themeId, mode, fontId } = appearance;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            'w-64 rounded-xl border border-border bg-card/95 shadow-lg',
            'backdrop-blur-sm p-4 flex flex-col gap-4',
          )}
        >
          {/* Theme section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
              Theme
            </p>
            <div className="flex gap-2 flex-wrap">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  title={t.name}
                  onClick={() => handleTheme(t.id)}
                  className={cn(
                    'relative w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                    themeId === t.id
                      ? 'border-foreground scale-110 shadow-md'
                      : 'border-transparent hover:scale-105',
                  )}
                  aria-label={t.name}
                  aria-pressed={themeId === t.id}
                >
                  {/* Diagonal split swatch */}
                  <span
                    className="absolute inset-0"
                    style={{ background: t.primary }}
                  />
                  <span
                    className="absolute inset-0"
                    style={{
                      background: t.accent,
                      clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    }}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {THEMES.find((t) => t.id === themeId)?.name}
            </p>
          </div>

          {/* Mode section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
              Mode
            </p>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['light', 'dark'] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleMode(m)}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium capitalize transition-colors',
                    mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {m === 'light' ? '☀\uFE0F Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>

          {/* Font section */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Font
            </p>
            <div className="flex flex-col gap-1">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFont(f.id)}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                    fontId === f.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={fontId === f.id}
                >
                  <span style={{ fontFamily: `'${f.display}', sans-serif` }}>
                    {f.name}
                  </span>
                  <span
                    className="text-xs opacity-60 ml-2"
                    style={{ fontFamily: `'${f.display}', sans-serif` }}
                  >
                    Aa
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Appearance settings"
        aria-expanded={open}
        className={cn(
          'w-11 h-11 rounded-full shadow-md border border-border bg-card',
          'flex items-center justify-center transition-all',
          'hover:scale-105 hover:shadow-lg',
          open && 'bg-primary text-primary-foreground border-primary',
        )}
      >
        <Palette className="w-5 h-5" />
      </button>
    </div>
  );
}
