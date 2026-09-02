/**
 * Preferred / scheduled time windows for Mike's Handyman Service (Austin, TX → Eastern Time).
 * Product rule: never offer a window that has already ended for the selected date.
 */

export const TIME_WINDOWS = ['morning', 'afternoon', 'evening'] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Local hour (0–23) when each window is considered over for booking requests. */
const WINDOW_END_HOUR: Record<TimeWindow, number> = {
  morning: 12,
  afternoon: 17,
  evening: 20,
};

const BUSINESS_TZ = 'America/New_York';

function partsInTz(date = new Date(), timeZone = BUSINESS_TZ) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const map = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
  };
}

/** Today's date as YYYY-MM-DD in business timezone (for `<input type="date" min>`). */
export function todayDateKey(now = new Date()): string {
  return partsInTz(now).dateKey;
}

export function isTimeWindowAvailable(
  window: TimeWindow,
  dateKey: string | undefined | null,
  now = new Date(),
): boolean {
  const { dateKey: today, hour } = partsInTz(now);
  const day = dateKey?.trim() || today;

  if (day < today) return false;
  if (day > today) return true;
  return hour < WINDOW_END_HOUR[window];
}

/**
 * 30-minute arrival slots for each time window.
 * The last slot is 30 min before the window's official end so the job
 * can finish within the window.
 */
export const WINDOW_SPECIFIC_SLOTS: Record<TimeWindow, string[]> = {
  morning: [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM',
  ],
  afternoon: [
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM',
  ],
  evening: [
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
    '7:00 PM', '7:30 PM',
  ],
};

/** Windows still open for the given date (defaults to today when date is empty). */
export function availableTimeWindows(
  dateKey?: string | null,
  now = new Date(),
): TimeWindow[] {
  return TIME_WINDOWS.filter((w) => isTimeWindowAvailable(w, dateKey, now));
}
