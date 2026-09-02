/**
 * Service Requests admin — pending client leads awaiting confirmation.
 */
import { useMemo, useState } from 'react';
import {
  useListServiceRequests,
  useUpdateServiceRequest,
  useConfirmServiceRequest,
  getGetServiceRequestSummaryQueryKey,
  type ServiceRequest,
} from '@workspace/api-client-react';
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
import {
  Loader2,
  Mail,
  MapPin,
  Wrench,
  FileText,
  Calendar,
  Clock,
  Film,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PhoneDisplay } from '@/components/PhoneDisplay';
import {
  TIME_WINDOW_LABELS,
  WINDOW_SPECIFIC_SLOTS,
  availableTimeWindows,
  isTimeWindowAvailable,
  todayDateKey,
  type TimeWindow,
} from '@/lib/time-windows';
import { URGENCY_LABELS, type Urgency } from '@/lib/urgency';

const PAGE_SIZE = 20;

const statusStyles: Record<string, string> = {
  pending: 'bg-accent text-accent-foreground',
  contacted: 'bg-chart-3 text-white',
  converted: 'bg-primary text-primary-foreground',
  declined: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  converted: 'Converted',
  declined: 'Declined',
};

type StatusAction = 'contacted' | 'declined';

type StatusConfirmation = {
  request: ServiceRequest;
  status: StatusAction;
};

export function ServiceRequestsAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    'open' | 'pending' | 'contacted' | 'converted' | 'declined' | 'all'
  >('open');
  const [confirming, setConfirming] = useState<ServiceRequest | null>(null);
  const [statusConfirmation, setStatusConfirmation] =
    useState<StatusConfirmation | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState<TimeWindow>('morning');
  const [scheduledSpecificTime, setScheduledSpecificTime] = useState<string>('');
  const minConfirmDate = todayDateKey();
  const openConfirmWindows = useMemo(
    () => availableTimeWindows(scheduledDate || undefined),
    [scheduledDate],
  );

  const listParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter,
    }),
    [page, statusFilter],
  );

  const { data, isLoading, isError } = useListServiceRequests(listParams);
  const updateMutation = useUpdateServiceRequest();
  const confirmMutation = useConfirmServiceRequest();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
    queryClient.invalidateQueries({ queryKey: getGetServiceRequestSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
  };

  const openStatusConfirmation = (request: ServiceRequest, status: StatusAction) => {
    setStatusConfirmation({ request, status });
  };

  const confirmStatusChange = () => {
    if (!statusConfirmation || updateMutation.isPending) return;

    const { request, status } = statusConfirmation;
    updateMutation.mutate(
      { id: request.id, data: { status } },
      {
        onSuccess: () => {
          setStatusConfirmation(null);
          invalidate();
          toast({
            title: status === 'contacted' ? 'Request marked contacted' : 'Request declined',
            description: `${request.name}'s service request was updated.`,
          });
        },
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: 'Update failed',
            description: err instanceof Error ? err.message : 'Try again',
          }),
      },
    );
  };

  const openConfirm = (request: ServiceRequest) => {
    setConfirming(request);
    const date =
      request.preferredDate && request.preferredDate >= todayDateKey()
        ? request.preferredDate
        : todayDateKey();
    const windows = availableTimeWindows(date);
    const preferred = request.preferredTime as TimeWindow | null;
    const time =
      preferred && isTimeWindowAvailable(preferred, date)
        ? preferred
        : windows[0] ?? 'morning';
    setScheduledDate(date);
    setScheduledTime(time);
    setScheduledSpecificTime('');
  };

  const submitConfirm = () => {
    if (!confirming) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      toast({
        variant: 'destructive',
        title: 'Date required',
        description: 'Pick a confirmed date before booking.',
      });
      return;
    }
    if (scheduledDate < todayDateKey()) {
      toast({
        variant: 'destructive',
        title: 'Date in the past',
        description: 'Choose today or a future date.',
      });
      return;
    }
    if (!isTimeWindowAvailable(scheduledTime, scheduledDate)) {
      toast({
        variant: 'destructive',
        title: 'Time window unavailable',
        description: 'That window has already passed — pick another.',
      });
      return;
    }
    confirmMutation.mutate(
      {
        id: confirming.id,
        data: {
          scheduledDate,
          scheduledTime,
          scheduledSpecificTime: scheduledSpecificTime || null,
        },
      },
      {
        onSuccess: (result) => {
          setConfirming(null);
          invalidate();
          const warning = result.notifications.warning;
          toast({
            title: 'Moved to Bookings',
            description: warning
              ? `Saved to schedule. Email note: ${warning}`
              : result.notifications.emailSent
                ? 'Client confirmation email sent. Request is now on the Bookings schedule.'
                : 'Request left this queue and is now on the Bookings schedule.',
          });
        },
        onError: (err) =>
          toast({
            variant: 'destructive',
            title: 'Confirm failed',
            description: err instanceof Error ? err.message : 'Try again',
          }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading service requests...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive font-medium">
        Could not load service requests. Check that the API is running.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight">Service Requests</h2>
          <p className="text-muted-foreground mt-1">
            {pendingCount} pending · {total} in this queue. Confirming moves a request into Bookings.
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as typeof statusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-52 font-medium">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open queue</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted (archive)</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="all">Everything</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {statusFilter === 'open'
          ? 'No open service requests. Confirmed jobs are under Bookings.'
          : 'No service requests in this view.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((request) => (
            <Card key={request.id} className="border-2 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-xl">{request.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      #{request.id} ·{' '}
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {request.source === 'phone' && (
                      <Badge variant="outline" className="font-semibold text-xs gap-1">
                        <span>📞</span> Phone
                      </Badge>
                    )}
                    {(request.urgency === 'urgent' || request.urgency === 'soon') && (
                      <Badge
                        className={cn(
                          'font-semibold',
                          request.urgency === 'urgent'
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-foreground',
                        )}
                      >
                        {URGENCY_LABELS[request.urgency as Urgency]}
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        'font-semibold',
                        statusStyles[request.status] ?? statusStyles.pending,
                      )}
                    >
                      {statusLabels[request.status] ?? request.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <PhoneDisplay
                    phone={request.phone}
                    className="font-medium md:hover:text-foreground"
                    iconClassName="w-4 h-4"
                  />
                  {request.email ? (
                    <a
                      href={`mailto:${request.email}`}
                      className="inline-flex items-center gap-2 font-medium hover:text-accent"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      {request.email}
                    </a>
                  ) : null}
                  <p className="inline-flex items-center gap-2">
                    <Wrench className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {request.service}
                  </p>
                  {(request.preferredDate || request.preferredTime) && (
                    <p className="inline-flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 shrink-0" />
                      {[request.preferredDate, request.preferredTime].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {request.jobAddress && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(request.jobAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-medium hover:text-accent sm:col-span-2"
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                      {request.jobAddress}
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex gap-2">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{request.description}</span>
                </p>

                {request.photoUrls?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Photos ({request.photoUrls.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {request.photoUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted hover:border-primary/40 transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Photo from ${request.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {request.videoUrls?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5" />
                      Videos ({request.videoUrls.length})
                    </p>
                    <div className="space-y-3">
                      {request.videoUrls.map((url, i) => (
                        <video
                          key={url}
                          src={url}
                          controls
                          preload="metadata"
                          className="w-full max-w-md rounded-xl border-2 border-border bg-black"
                          aria-label={`Video ${i + 1} from ${request.name}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {request.status !== 'converted' && request.status !== 'declined' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {request.status !== 'contacted' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateMutation.isPending}
                        onClick={() => openStatusConfirmation(request, 'contacted')}
                        className="font-display font-bold"
                      >
                        Mark contacted
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => openConfirm(request)}
                      className="font-display font-bold"
                    >
                      Confirm booking
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={updateMutation.isPending}
                      onClick={() => openStatusConfirmation(request, 'declined')}
                      className="font-display font-bold text-destructive hover:text-destructive"
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="font-display font-bold"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="font-display font-bold"
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={statusConfirmation != null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setStatusConfirmation(null);
        }}
      >
        <DialogContent className="rounded-3xl border-2 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {statusConfirmation?.status === 'declined'
                ? 'Decline this request?'
                : 'Mark this request contacted?'}
            </DialogTitle>
            <DialogDescription>
              {statusConfirmation
                ? statusConfirmation.status === 'declined'
                  ? `You are about to decline ${statusConfirmation.request.name}'s service request. It will leave the open queue and cannot be restored from this screen.`
                  : `You are about to mark ${statusConfirmation.request.name}'s service request as contacted. It will leave the pending queue.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-semibold">
              {statusConfirmation?.request.name}
              {statusConfirmation ? ` · Request #${statusConfirmation.request.id}` : null}
            </p>
            <p className="mt-1 text-muted-foreground">
              Status after confirmation:{' '}
              <span className="font-semibold text-foreground">
                {statusConfirmation
                  ? statusLabels[statusConfirmation.status]
                  : null}
              </span>
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setStatusConfirmation(null)}
              className="font-display font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={statusConfirmation?.status === 'declined' ? 'destructive' : 'default'}
              disabled={updateMutation.isPending || statusConfirmation == null}
              onClick={confirmStatusChange}
              className="font-display font-bold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : statusConfirmation?.status === 'declined' ? (
                'Decline request'
              ) : (
                'Mark contacted'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirming != null}
        onOpenChange={(open) => {
          if (!open && !confirmMutation.isPending) setConfirming(null);
        }}
      >
        <DialogContent className="rounded-3xl border-2 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Confirm booking
            </DialogTitle>
            <DialogDescription>
              {confirming
                ? `Set the final date and time for ${confirming.name}. This adds them to your schedule and notifies the client.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="confirm-date">Confirmed date</Label>
              <Input
                id="confirm-date"
                type="date"
                min={minConfirmDate}
                value={scheduledDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setScheduledDate(next);
                  const windows = availableTimeWindows(next || undefined);
                  if (!windows.includes(scheduledTime)) {
                    setScheduledTime(windows[0] ?? 'morning');
                    setScheduledSpecificTime('');
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmed time window</Label>
              <Select
                key={`${scheduledDate}-${openConfirmWindows.join('-')}`}
                value={
                  openConfirmWindows.includes(scheduledTime)
                    ? scheduledTime
                    : openConfirmWindows[0]
                }
                onValueChange={(v) => {
                  setScheduledTime(v as TimeWindow);
                  setScheduledSpecificTime('');
                }}
                disabled={openConfirmWindows.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      openConfirmWindows.length === 0
                        ? 'No windows left today'
                        : 'Select time window'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {openConfirmWindows.map((window) => (
                    <SelectItem key={window} value={window}>
                      {TIME_WINDOW_LABELS[window]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {openConfirmWindows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  All windows for today have passed — pick tomorrow or later.
                </p>
              ) : null}
            </div>
            {openConfirmWindows.length > 0 ? (
              <div className="space-y-2">
                <Label>
                  Specific arrival time{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select
                  key={`specific-${scheduledTime}`}
                  value={scheduledSpecificTime}
                  onValueChange={(v) => setScheduledSpecificTime(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No specific time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No specific time</SelectItem>
                    {WINDOW_SPECIFIC_SLOTS[scheduledTime].map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={confirmMutation.isPending}
              onClick={() => setConfirming(null)}
              className="font-display font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                confirmMutation.isPending || openConfirmWindows.length === 0
              }
              onClick={submitConfirm}
              className="font-display font-bold"
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Confirm booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
