/**
 * Confirmed bookings schedule — date-wise, including past with status.
 * Includes "Record phone booking" for calls the owner takes directly.
 * Supports a List view (grouped by date) and a Calendar day view (30-min slots).
 */
import { useMemo, useState } from 'react';
import {
  useListBookings,
  useUpdateBooking,
  useCreatePhoneBooking,
  type Booking,
} from '@workspace/api-client-react';
import { ListBookingsResponseItem } from '@workspace/api-zod';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Mail, MapPin, CalendarDays, Phone, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { PhoneDisplay } from '@/components/PhoneDisplay';
import { format, parseISO, isToday, isBefore, startOfDay, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  TIME_WINDOWS,
  TIME_WINDOW_LABELS,
  WINDOW_SPECIFIC_SLOTS,
  availableTimeWindows,
  isTimeWindowAvailable,
  todayDateKey,
  type TimeWindow,
} from '@/lib/time-windows';
import { DayCalendar } from '@/components/DayCalendar';

type ViewMode = 'list' | 'calendar';

function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem('bookings-view');
    return v === 'calendar' ? 'calendar' : 'list';
  } catch {
    return 'list';
  }
}

function saveViewMode(mode: ViewMode) {
  try {
    localStorage.setItem('bookings-view', mode);
  } catch {
    // ignore
  }
}

const SERVICES = [
  'Electrical & Lighting',
  'Mounting & TV Installation',
  'Plumbing Services',
  'Furniture Assembly & Repair',
  'Home Repairs & Maintenance',
];

const statusStyles: Record<string, string> = {
  confirmed: 'bg-primary text-primary-foreground',
  completed: 'bg-chart-5 text-white',
  cancelled: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const timeLabels: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd');
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  service: '',
  description: '',
  date: todayDateKey(),
  window: 'morning' as TimeWindow,
  specificTime: '',
};

export function BookingsAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rawBookings, isLoading, isError } = useListBookings();

  // Validate each booking against the API schema before it reaches rendering.
  // Any record that fails the zod parse is dropped so a single bad row can't
  // crash the whole page; a console warning identifies it for debugging.
  const bookings = useMemo(
    () =>
      (rawBookings ?? []).flatMap((item) => {
        const result = ListBookingsResponseItem.safeParse(item);
        if (result.success) return [result.data as Booking];
        console.warn(
          '[BookingsAdmin] dropping malformed booking (id=%s):',
          (item as { id?: unknown })?.id,
          result.error.flatten(),
        );
        return [];
      }),
    [rawBookings],
  );
  const updateMutation = useUpdateBooking();
  const phoneMutation = useCreatePhoneBooking();

  // View mode — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [calendarDate, setCalendarDate] = useState(todayDateKey);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  };

  // Phone booking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const phoneWindows = useMemo(
    () => availableTimeWindows(form.date || undefined),
    [form.date],
  );

  /** Windows already occupied by a non-cancelled booking on the selected form date. */
  const bookedWindows = useMemo(() => {
    const set = new Set<TimeWindow>();
    for (const b of bookings) {
      if (
        b.scheduledDate === form.date &&
        b.status !== 'cancelled' &&
        TIME_WINDOWS.includes(b.scheduledTime as TimeWindow)
      ) {
        set.add(b.scheduledTime as TimeWindow);
      }
    }
    return set;
  }, [bookings, form.date]);

  const openDialog = () => {
    const today = todayDateKey();
    const windows = availableTimeWindows(today);
    setForm({ ...EMPTY_FORM, date: today, window: windows[0] ?? 'morning' });
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (!phoneMutation.isPending) {
      setFormErrors({});
      setDialogOpen(false);
    }
  };

  const patch = (fields: Partial<typeof EMPTY_FORM>) => {
    // Clear errors for any field being changed
    if (Object.keys(fields).some((k) => k in formErrors)) {
      setFormErrors((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(fields)) delete next[k];
        return next;
      });
    }
    setForm((prev) => ({ ...prev, ...fields }));
  };

  const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NAME_RE = /^[A-Za-z\s'\-.]{2,}$/;

  const submitPhone = () => {
    // ── 1. Booked-window conflict guard (fires before field validation) ──────
    // A valid future date + a window already taken → toast immediately so the
    // owner knows they must pick a different slot before anything else.
    const dateIsValid =
      !!form.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(form.date) &&
      form.date >= todayDateKey();

    if (dateIsValid && bookedWindows.has(form.window)) {
      toast({
        variant: 'destructive',
        title: 'Already Booked',
        description: `${TIME_WINDOW_LABELS[form.window]} is already booked on ${form.date}. Please choose a different time window.`,
      });
      return;
    }

    // ── 2. Field-level validation (all errors collected in one pass) ─────────
    const errs: Record<string, string> = {};

    const nameVal = form.name.trim();
    if (!nameVal) {
      errs.name = 'Customer name is required.';
    } else if (nameVal.length < 2) {
      errs.name = 'Please enter the full customer name (at least 2 characters).';
    } else if (!NAME_RE.test(nameVal)) {
      errs.name = 'Name should only contain letters, spaces, and hyphens.';
    }

    const phoneVal = form.phone.trim();
    if (!phoneVal) {
      errs.phone = 'Phone number is required.';
    } else if (!PHONE_RE.test(phoneVal)) {
      errs.phone = 'Enter a valid phone number — e.g. (555) 123-4567.';
    }

    const emailVal = form.email.trim();
    if (emailVal && !EMAIL_RE.test(emailVal)) {
      errs.email = 'Enter a valid email address — e.g. customer@example.com.';
    }

    if (!form.service) errs.service = 'Please select a service.';
    if (!form.description.trim()) errs.description = 'Job description is required.';

    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      errs.date = 'Please pick a confirmed date.';
    } else if (form.date < todayDateKey()) {
      errs.date = 'Date is in the past — choose today or later.';
    }

    if (!errs.date && !isTimeWindowAvailable(form.window, form.date)) {
      errs.window = 'That window has already passed — pick another.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setFormErrors({});

    phoneMutation.mutate(
      {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          service: form.service,
          description: form.description.trim(),
          scheduledDate: form.date,
          scheduledTime: form.window,
          scheduledSpecificTime: form.specificTime || null,
        },
      },
      {
        onSuccess: (result) => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
          queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
          const w = result.notifications.warning;
          toast({
            title: 'Phone booking recorded',
            description: w
              ? `Booking saved. Email note: ${w}`
              : result.notifications.emailSent
                ? 'Booking saved and confirmation email sent to client.'
                : 'Booking saved. No email sent (no address provided).',
          });
        },
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: 'Failed to record booking',
            description: err instanceof Error ? err.message : 'Try again',
          }),
      },
    );
  };

  const grouped = useMemo(() => {
    const list = [...(bookings ?? [])].sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '');
      }
      return (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '');
    });

    const today: { date: string; items: Booking[] }[] = [];
    const upcoming: { date: string; items: Booking[] }[] = [];
    const past: { date: string; items: Booking[] }[] = [];
    const byDate = new Map<string, Booking[]>();

    for (const booking of list) {
      const bucket = byDate.get(booking.scheduledDate) ?? [];
      bucket.push(booking);
      byDate.set(booking.scheduledDate, bucket);
    }

    const todayStart = startOfDay(new Date());
    for (const [date, items] of [...byDate.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const section = { date, items };
      try {
        const d = parseISO(date);
        if (isToday(d)) today.push(section);
        else if (isBefore(d, todayStart)) past.push(section);
        else upcoming.push(section);
      } catch {
        upcoming.push(section);
      }
    }

    past.reverse();
    return { today, upcoming, past };
  }, [bookings]);

  const setStatus = (booking: Booking, status: 'confirmed' | 'completed' | 'cancelled') => {
    updateMutation.mutate(
      { id: booking.id, data: { status } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }),
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: 'Update failed',
            description: err instanceof Error ? err.message : 'Try again',
          }),
      },
    );
  };

  // ── All hooks must come before any early return ──────────────────────────
  const total = bookings?.length ?? 0;

  // Bookings for the selected calendar date (used by DayCalendar)
  const calendarBookings = useMemo(
    () => (bookings ?? []).filter((b) => b.scheduledDate === calendarDate),
    [bookings, calendarDate],
  );

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive font-medium">
        Could not load bookings. Check that the API is running.
      </p>
    );
  }

  const renderSection = (
    title: string,
    sections: { date: string; items: Booking[] }[],
    empty: string,
  ) => (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        {title}
      </h3>
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        sections.map(({ date, items }) => (
          <div key={date} className="space-y-3">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {(() => {
                try {
                  const d = parseISO(date);
                  return date === todayIso()
                    ? `Today · ${format(d, 'MMM d, yyyy')}`
                    : format(d, 'EEEE, MMM d, yyyy');
                } catch {
                  return date;
                }
              })()}
            </p>
            <div className="space-y-3">
              {items.map((booking) => (
                <Card key={booking.id} className="border-2 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="font-display text-lg">
                          {timeLabels[booking.scheduledTime] ?? booking.scheduledTime ?? '—'}
                          {booking.scheduledSpecificTime
                            ? ` · ${booking.scheduledSpecificTime}`
                            : ''}{' '}
                          · {booking.name || 'Unknown customer'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {booking.service || 'Unknown service'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {booking.source === 'phone' && (
                          <Badge variant="outline" className="font-semibold text-xs gap-1">
                            <Phone className="w-3 h-3" />
                            Phone
                          </Badge>
                        )}
                        <Badge
                          className={cn(
                            'font-semibold',
                            statusStyles[booking.status] ?? statusStyles.confirmed,
                          )}
                        >
                          {statusLabels[booking.status] ?? booking.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {booking.phone ? (
                        <PhoneDisplay
                          phone={booking.phone}
                          className="font-medium"
                          iconClassName="w-3.5 h-3.5"
                        />
                      ) : (
                        <span className="text-muted-foreground italic">No phone</span>
                      )}
                      {booking.email && (
                        <a
                          href={`mailto:${booking.email}`}
                          className="inline-flex items-center gap-1.5 font-medium hover:text-accent"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {booking.email}
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap flex gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0" aria-hidden />
                      <span>{booking.description || <em>No description</em>}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {booking.status !== 'completed' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending}
                          onClick={() => setStatus(booking, 'completed')}
                          className="font-display font-bold"
                        >
                          Mark completed
                        </Button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={updateMutation.isPending}
                          onClick={() => setStatus(booking, 'cancelled')}
                          className="font-display font-bold text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      )}
                      {booking.status !== 'confirmed' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={updateMutation.isPending}
                          onClick={() => setStatus(booking, 'confirmed')}
                          className="font-display font-bold"
                        >
                          Reopen confirmed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Date navigation helpers
  const navDate = (delta: number) => {
    try {
      const d = parseISO(calendarDate);
      setCalendarDate(format(delta > 0 ? addDays(d, delta) : subDays(d, Math.abs(delta)), 'yyyy-MM-dd'));
    } catch {
      setCalendarDate(todayDateKey());
    }
  };

  const calendarHeaderLabel = (() => {
    try {
      const d = parseISO(calendarDate);
      return isToday(d)
        ? `Today · ${format(d, 'EEEE, MMM d')}`
        : format(d, 'EEEE, MMM d, yyyy');
    } catch {
      return calendarDate;
    }
  })();

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight">Bookings</h2>
          <p className="text-muted-foreground mt-1">
            {total} confirmed appointment{total === 1 ? '' : 's'} on your schedule.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* List / Calendar toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => switchView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-display font-bold transition-colors',
                viewMode === 'list'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => switchView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-display font-bold transition-colors',
                viewMode === 'calendar'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>

          <Button
            type="button"
            onClick={openDialog}
            className="font-display font-bold gap-2"
          >
            <Phone className="w-4 h-4" />
            Record phone booking
          </Button>
        </div>
      </div>

      {/* ── Calendar date navigation ── */}
      {viewMode === 'calendar' && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navDate(-1)}
            aria-label="Previous day"
            className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCalendarDate(todayDateKey())}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-display font-bold hover:bg-muted/50 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navDate(1)}
            aria-label="Next day"
            className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="font-display font-semibold text-sm sm:text-base flex-1 min-w-0 truncate">
            {calendarHeaderLabel}
          </span>

          <input
            type="date"
            value={calendarDate}
            onChange={(e) => e.target.value && setCalendarDate(e.target.value)}
            aria-label="Jump to date"
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      )}

      {/* ── Calendar view ── */}
      {viewMode === 'calendar' ? (
        <DayCalendar
          bookings={calendarBookings}
          date={calendarDate}
          onStatusChange={(booking, status) => setStatus(booking, status)}
          isPending={updateMutation.isPending}
        />
      ) : (
        <div className="space-y-10">
          {renderSection('Today', grouped.today, 'No bookings scheduled for today.')}
          {renderSection('Upcoming', grouped.upcoming, 'No upcoming bookings yet.')}
          {renderSection('Past', grouped.past, 'No past bookings yet.')}
        </div>
      )}

      {/* Phone booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="rounded-3xl border-2 sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Record phone booking
            </DialogTitle>
            <DialogDescription>
              Fill in the customer details and confirmed schedule while on the call. A confirmation email will be sent if you provide their email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Customer info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pb-name">Customer name <span className="text-destructive">*</span></Label>
                <Input
                  id="pb-name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  aria-invalid={!!formErrors.name}
                  className={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {formErrors.name && (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-phone">Phone <span className="text-destructive">*</span></Label>
                <Input
                  id="pb-phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  aria-invalid={!!formErrors.phone}
                  className={formErrors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {formErrors.phone && (
                  <p className="text-xs text-destructive">{formErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pb-email">
                Email{' '}
                <span className="text-muted-foreground font-normal">(optional — needed to send confirmation)</span>
              </Label>
              <Input
                id="pb-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Service <span className="text-destructive">*</span></Label>
              <Select
                value={form.service}
                onValueChange={(v) => patch({ service: v })}
              >
                <SelectTrigger
                  aria-invalid={!!formErrors.service}
                  className={formErrors.service ? 'border-destructive focus:ring-destructive' : ''}
                >
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.service && (
                <p className="text-xs text-destructive">{formErrors.service}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pb-description">Job description <span className="text-destructive">*</span></Label>
              <textarea
                id="pb-description"
                rows={3}
                placeholder="Briefly describe the work needed…"
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                aria-invalid={!!formErrors.description}
                className={cn(
                  'w-full rounded-xl border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 resize-none',
                  formErrors.description
                    ? 'border-destructive focus-visible:ring-destructive'
                    : 'border-input focus-visible:ring-ring',
                )}
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label htmlFor="pb-date">Confirmed date <span className="text-destructive">*</span></Label>
              <Input
                id="pb-date"
                type="date"
                min={todayDateKey()}
                value={form.date}
                aria-invalid={!!formErrors.date}
                className={formErrors.date ? 'border-destructive focus-visible:ring-destructive' : ''}
                onChange={(e) => {
                  const next = e.target.value;
                  const windows = availableTimeWindows(next || undefined);
                  const win = windows.includes(form.window) ? form.window : (windows[0] ?? 'morning');
                  patch({ date: next, window: win, specificTime: win !== form.window ? '' : form.specificTime });
                }}
              />
              {formErrors.date && (
                <p className="text-xs text-destructive">{formErrors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Time window <span className="text-destructive">*</span></Label>
              <Select
                key={`${form.date}-${phoneWindows.join('-')}`}
                value={phoneWindows.includes(form.window) ? form.window : (phoneWindows[0] ?? 'morning')}
                onValueChange={(v) => patch({ window: v as TimeWindow, specificTime: '' })}
                disabled={phoneWindows.length === 0}
              >
                <SelectTrigger
                  aria-invalid={!!formErrors.window}
                  className={formErrors.window ? 'border-destructive focus:ring-destructive' : ''}
                >
                  <SelectValue placeholder={phoneWindows.length === 0 ? 'No windows left today' : 'Select time window'} />
                </SelectTrigger>
                <SelectContent>
                  {phoneWindows.map((w) => (
                    <SelectItem key={w} value={w}>
                      {bookedWindows.has(w)
                        ? `${TIME_WINDOW_LABELS[w]} (Already booked)`
                        : TIME_WINDOW_LABELS[w]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.window ? (
                <p className="text-xs text-destructive">{formErrors.window}</p>
              ) : phoneWindows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  All windows for today have passed — pick tomorrow or later.
                </p>
              ) : null}
            </div>

            {phoneWindows.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Specific arrival time{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select
                  value={form.specificTime || '__none__'}
                  onValueChange={(v) => patch({ specificTime: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No specific time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific time</SelectItem>
                    {WINDOW_SPECIFIC_SLOTS[form.window].map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={phoneMutation.isPending}
              className="font-display font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitPhone}
              disabled={phoneMutation.isPending}
              className="font-display font-bold gap-2"
            >
              {phoneMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
