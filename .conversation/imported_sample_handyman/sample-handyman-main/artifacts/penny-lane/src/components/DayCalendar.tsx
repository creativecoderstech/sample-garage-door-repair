/**
 * DayCalendar — vertical 30-minute-slot day view for admin bookings.
 *
 * Grid: 9:00 AM → 8:00 PM  (22 half-hour slots, 56 px each)
 * Specific-time bookings sit at their exact slot.
 * Window-only bookings span the full window range with a striped fill.
 * Overlapping bookings render side-by-side.
 * A "now" hairline appears when the selected date is today.
 */
import { useState, useEffect, useRef } from 'react';
import type { Booking } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Phone, Mail, MapPin } from 'lucide-react';
import { PhoneDisplay } from '@/components/PhoneDisplay';
import { cn } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';

// ─── Grid constants ─────────────────────────────────────────────────────────

const SLOT_H = 56; // px per 30-minute slot
const CAL_START = 9 * 60; // 9:00 AM in minutes-from-midnight
const CAL_END = 20 * 60; // 8:00 PM in minutes-from-midnight
const TOTAL_MIN = CAL_END - CAL_START; // 660 minutes
const SLOT_MIN = 30;
const TOTAL_SLOTS = TOTAL_MIN / SLOT_MIN; // 22 slots
const TOTAL_H = TOTAL_SLOTS * SLOT_H; // 1232 px

function minToPx(min: number) {
  return (min / SLOT_MIN) * SLOT_H;
}

function calMinToLabel(calMin: number): string {
  const total = CAL_START + calMin;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  if (m === 0) return `${h12} ${period}`;
  return `${h12}:${m.toString().padStart(2, '0')}`;
}

// 23 time markers: 0, 30, 60, …, 660 min from cal start
const TIME_MARKERS = Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => ({
  calMin: i * SLOT_MIN,
  label: calMinToLabel(i * SLOT_MIN),
  isHour: i % 2 === 0,
}));

// Window zones (minutes from cal start)
const WINDOW_ZONES = {
  morning: { start: 0, end: 180, label: 'Morning' },
  afternoon: { start: 180, end: 480, label: 'Afternoon' },
  evening: { start: 480, end: 660, label: 'Evening' },
} as const;

type WindowKey = keyof typeof WINDOW_ZONES;

// ─── Status styles ───────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  confirmed: 'bg-primary',
  completed: 'bg-chart-5',
  cancelled: 'bg-muted',
};
const STATUS_TEXT: Record<string, string> = {
  confirmed: 'text-primary-foreground',
  completed: 'text-white',
  cancelled: 'text-muted-foreground',
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── Time parsing ────────────────────────────────────────────────────────────

/** Parse "9:00 AM" → minutes from cal start (9 AM), or null if invalid/out-of-range. */
function parseSpecificTime(time: string): number | null {
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] ?? '0', 10);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const calMin = h * 60 + min - CAL_START;
  if (calMin < 0 || calMin >= TOTAL_MIN) return null;
  return calMin;
}

// ─── Layout engine ───────────────────────────────────────────────────────────

type RawRange = {
  booking: Booking;
  startMin: number;
  endMin: number;
  isWindow: boolean;
};

type BookingBlock = RawRange & {
  col: number;
  totalCols: number;
};

function computeLayout(bookings: Booking[]): BookingBlock[] {
  const ranges: RawRange[] = [];

  for (const b of bookings) {
    if (b.scheduledSpecificTime) {
      const start = parseSpecificTime(b.scheduledSpecificTime);
      if (start !== null) {
        ranges.push({
          booking: b,
          startMin: start,
          endMin: Math.min(start + SLOT_MIN, TOTAL_MIN),
          isWindow: false,
        });
        continue;
      }
    }
    const win = b.scheduledTime as WindowKey;
    if (win in WINDOW_ZONES) {
      const z = WINDOW_ZONES[win];
      ranges.push({ booking: b, startMin: z.start, endMin: z.end, isWindow: true });
    }
  }

  // Sort: start asc, then longer ranges first (so window blocks go to col 0)
  ranges.sort((a, b) =>
    a.startMin !== b.startMin ? a.startMin - b.startMin : b.endMin - a.endMin,
  );

  // Greedy column assignment
  const colEnds: number[] = [];
  const withCols = ranges.map((r) => {
    let col = 0;
    while (col < colEnds.length && colEnds[col] > r.startMin) col++;
    colEnds[col] = r.endMin;
    return { ...r, col };
  });

  // Compute totalCols per block from overlapping peers
  return withCols.map((item) => {
    const peers = withCols.filter(
      (o) => o.startMin < item.endMin && o.endMin > item.startMin,
    );
    const totalCols = Math.max(...peers.map((p) => p.col)) + 1;
    return { ...item, totalCols };
  });
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DayCalendarProps {
  bookings: Booking[];
  date: string; // YYYY-MM-DD
  onStatusChange: (booking: Booking, status: 'confirmed' | 'completed' | 'cancelled') => void;
  isPending?: boolean;
}

// ─── Block detail dialog ─────────────────────────────────────────────────────

function BlockDialog({
  block,
  open,
  onClose,
  onStatusChange,
  isPending,
}: {
  block: BookingBlock | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (booking: Booking, status: 'confirmed' | 'completed' | 'cancelled') => void;
  isPending?: boolean;
}) {
  if (!block) return null;
  const b = block.booking;
  const timeLabel = block.isWindow
    ? WINDOW_ZONES[b.scheduledTime as WindowKey]?.label ?? b.scheduledTime
    : (b.scheduledSpecificTime ?? b.scheduledTime);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl border-2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold flex items-start gap-2">
            <span
              className={cn(
                'mt-0.5 w-2.5 h-2.5 rounded-full shrink-0',
                STATUS_BG[b.status] ?? STATUS_BG.confirmed,
              )}
            />
            {b.name}
          </DialogTitle>
          <DialogDescription className="text-left space-y-1 mt-1">
            <span className="block">{b.service}</span>
            <span className="block text-xs">
              {timeLabel}
              {block.isWindow && ' (flexible arrival)'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Contact */}
          <div className="flex flex-wrap gap-3 text-sm">
            <PhoneDisplay phone={b.phone} className="font-medium" iconClassName="w-3.5 h-3.5" />
            {b.email && (
              <a
                href={`mailto:${b.email}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-accent"
              >
                <Mail className="w-3.5 h-3.5" />
                {b.email}
              </a>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap flex gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0" aria-hidden />
            <span>{b.description}</span>
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            {b.source === 'phone' && (
              <Badge variant="outline" className="font-semibold text-xs gap-1">
                <Phone className="w-3 h-3" />
                Phone
              </Badge>
            )}
            <Badge
              className={cn(
                'font-semibold',
                STATUS_BG[b.status] ?? STATUS_BG.confirmed,
                STATUS_TEXT[b.status] ?? STATUS_TEXT.confirmed,
              )}
            >
              {STATUS_LABEL[b.status] ?? b.status}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {b.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onStatusChange(b, 'completed')}
                className="font-display font-bold"
              >
                Mark completed
              </Button>
            )}
            {b.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onStatusChange(b, 'cancelled')}
                className="font-display font-bold text-destructive hover:text-destructive"
              >
                Cancel
              </Button>
            )}
            {b.status !== 'confirmed' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => onStatusChange(b, 'confirmed')}
                className="font-display font-bold"
              >
                Reopen confirmed
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DayCalendar({ bookings, date, onStatusChange, isPending }: DayCalendarProps) {
  const [selected, setSelected] = useState<BookingBlock | null>(null);
  const [nowMin, setNowMin] = useState<number>(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes() - CAL_START;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayView = (() => {
    try {
      return isToday(parseISO(date));
    } catch {
      return false;
    }
  })();

  // Refresh now-line every minute
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes() - CAL_START);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to current time when viewing today, to now-10min otherwise top
  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollTarget = todayView
      ? Math.max(0, minToPx(nowMin) - 120)
      : 0;
    scrollRef.current.scrollTop = scrollTarget;
  }, [date, todayView]); // eslint-disable-line react-hooks/exhaustive-deps

  const blocks = computeLayout(bookings);

  const showNow = todayView && nowMin >= 0 && nowMin <= TOTAL_MIN;
  const nowPx = minToPx(nowMin);

  return (
    <>
      <div
        ref={scrollRef}
        className="relative overflow-y-auto max-h-[70vh] rounded-xl border border-border bg-background select-none"
      >
        {/* Inner grid wrapper — fixed height, relative for absolute children */}
        <div className="relative" style={{ height: TOTAL_H + SLOT_H /* extra for bottom label */ }}>

          {/* ── Window shade zones ── */}
          {(Object.entries(WINDOW_ZONES) as [WindowKey, typeof WINDOW_ZONES[WindowKey]][]).map(
            ([key, zone]) => (
              <div
                key={key}
                aria-hidden
                className={cn(
                  'absolute left-14 sm:left-16 right-0 pointer-events-none opacity-[0.035]',
                  key === 'morning' && 'bg-amber-400',
                  key === 'afternoon' && 'bg-sky-400',
                  key === 'evening' && 'bg-violet-400',
                )}
                style={{
                  top: minToPx(zone.start),
                  height: minToPx(zone.end - zone.start),
                }}
              />
            ),
          )}

          {/* ── Grid lines ── */}
          {TIME_MARKERS.map(({ calMin, isHour }) => (
            <div
              key={calMin}
              aria-hidden
              className={cn(
                'absolute left-14 sm:left-16 right-0 pointer-events-none',
                isHour ? 'border-t border-border/60' : 'border-t border-border/25',
              )}
              style={{ top: minToPx(calMin) }}
            />
          ))}

          {/* ── Time gutter ── */}
          <div className="absolute left-0 top-0 w-14 sm:w-16 flex flex-col pointer-events-none z-10">
            {TIME_MARKERS.map(({ calMin, label, isHour }) => (
              <div
                key={calMin}
                className="absolute right-2 sm:right-3"
                style={{ top: minToPx(calMin) - 8 /* center label on the line */ }}
              >
                <span
                  className={cn(
                    'text-[10px] sm:text-xs tabular-nums leading-none',
                    isHour
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground font-normal',
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Booking blocks ── */}
          <div className="absolute left-14 sm:left-16 right-1 top-0" style={{ height: TOTAL_H }}>
            {blocks.map((block) => {
              const top = minToPx(block.startMin);
              const height = Math.max(minToPx(block.endMin - block.startMin) - 2, SLOT_H - 4);
              const widthPct = 100 / block.totalCols;
              const leftPct = block.col * widthPct;
              const b = block.booking;
              const baseBg = STATUS_BG[b.status] ?? STATUS_BG.confirmed;
              const baseText = STATUS_TEXT[b.status] ?? STATUS_TEXT.confirmed;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelected(block)}
                  title={`${b.name} · ${b.service}`}
                  style={{
                    top,
                    height,
                    left: `${leftPct}%`,
                    width: `calc(${widthPct}% - 4px)`,
                    ...(block.isWindow
                      ? {
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.06) 6px, rgba(0,0,0,0.06) 12px)',
                        }
                      : {}),
                  }}
                  className={cn(
                    'absolute rounded-lg px-2 py-1.5 text-left cursor-pointer',
                    'ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    'transition-opacity hover:opacity-90 active:opacity-80',
                    block.isWindow ? 'opacity-80 border-2 border-dashed' : 'opacity-100',
                    baseBg,
                    baseText,
                    block.isWindow &&
                      (b.status === 'cancelled'
                        ? 'border-muted-foreground/40'
                        : b.status === 'completed'
                          ? 'border-chart-5/70'
                          : 'border-primary/60'),
                  )}
                >
                  <div className="flex items-center gap-1 flex-wrap leading-tight">
                    {b.source === 'phone' && (
                      <Phone
                        className="w-2.5 h-2.5 shrink-0 opacity-80"
                        aria-label="Phone booking"
                      />
                    )}
                    <span className="font-display font-bold text-[11px] sm:text-xs truncate">
                      {b.name}
                    </span>
                  </div>
                  {height >= 40 && (
                    <p className="text-[10px] sm:text-[11px] opacity-80 truncate mt-0.5 leading-tight">
                      {b.service}
                    </p>
                  )}
                  {height >= 60 && block.isWindow && (
                    <p className="text-[10px] opacity-70 mt-0.5 leading-tight">flexible arrival</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Now indicator ── */}
          {showNow && (
            <div
              aria-label="Current time"
              className="absolute left-12 sm:left-14 right-0 pointer-events-none z-20 flex items-center"
              style={{ top: nowPx }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 -ml-1.5" />
              <div className="flex-1 border-t-2 border-destructive" />
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No bookings scheduled for this day.
        </p>
      )}

      <BlockDialog
        block={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onStatusChange={(booking, status) => {
          onStatusChange(booking, status);
          setSelected(null);
        }}
        isPending={isPending}
      />
    </>
  );
}
