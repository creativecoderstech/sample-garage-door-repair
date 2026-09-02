import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCreateServiceRequest,
  useGetSiteSettings,
  getListServiceRequestsQueryKey,
  getGetServiceRequestSummaryQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, CheckCircle2, ExternalLink, Film, Loader2, Lock, MapPin, Sparkles, Star, Upload, Video, X } from 'lucide-react';
import {
  TIME_WINDOW_LABELS,
  availableTimeWindows,
  isTimeWindowAvailable,
  todayDateKey,
  type TimeWindow,
} from '@/lib/time-windows';
import { URGENCY_OPTIONS, type Urgency } from '@/lib/urgency';
import { cn } from '@/lib/utils';
import { VoiceInput } from '@/components/VoiceInput';

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_VIDEOS = 2;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

const services = [
  'Electrical & Lighting',
  'Mounting & TV Installation',
  'Plumbing Services',
  'Furniture Assembly & Repair',
  'Home Repairs & Maintenance',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

// Accepts common US formats: (555) 123-4567, 555-123-4567, +1 5551234567, etc.
const PHONE_RE = /^\(\d{3}\) \d{3}-\d{4}$/;

/** Strip non-digits, cap at 10, format as (XXX) XXX-XXXX */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Human-readable file size */
function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Name: at least 2 real characters, letters/spaces/hyphens/apostrophes/periods only
const NAME_RE = /^[A-Za-z\s'\-.]{2,}$/;

// ─── Schema ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the ZIP code is plausibly a Texas ZIP.
 * Texas ZIPs all start with 7 (range 73xxx–79xxx). Any first digit other than
 * '7' is clearly out-of-state (e.g. 30xxx = GA, 10xxx = NY, 90xxx = CA).
 */
function isTxZip(zip: string): boolean {
  const trimmed = zip.trim();
  return trimmed.length === 0 || trimmed[0] === '7';
}

const bookingSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Please enter your full name (at least 2 characters)')
      .max(100, 'Name is too long')
      .regex(NAME_RE, 'Name should only contain letters, spaces, and hyphens'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(PHONE_RE, 'Enter a valid phone number — e.g. (555) 123-4567'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address — e.g. you@example.com'),
    service: z.string().min(1, 'Please select a service'),
    jobStreet: z.string().min(1, 'Street address is required'),
    jobCity: z.string().min(1, 'City is required'),
    jobZip: z.string().optional(),
    description: z.string().min(1, 'Please describe what you need'),
    urgency: z.enum(['flexible', 'soon', 'urgent']),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const zip = data.jobZip?.trim() ?? '';
    if (zip.length > 0 && !isTxZip(zip)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['jobZip'],
        message:
          'That ZIP is outside Texas — we serve the Greater Austin Area. Call us at (512) 244-8550 to check availability.',
      });
    }
    const date = data.preferredDate?.trim() || undefined;
    if (date && date < todayDateKey()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preferredDate'],
        message: 'Pick today or a future date.',
      });
    }
    const time = data.preferredTime?.trim();
    if (
      time &&
      (time === 'morning' || time === 'afternoon' || time === 'evening') &&
      !isTimeWindowAvailable(time, date)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['preferredTime'],
        message: 'That time window has already passed — pick another.',
      });
    }
  });

type BookingFormData = z.infer<typeof bookingSchema>;

// ─── Types ──────────────────────────────────────────────────────────────────

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type VideoItem = {
  id: string;
  file: File;
  name: string;
  sizeLabel: string;
};

function revokePreviews(items: PhotoItem[]) {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Refs for the three hidden file inputs
  const browseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef  = useRef<HTMLInputElement>(null);
  const { data: siteSettings } = useGetSiteSettings();
  const googleReviewUrl = siteSettings?.googleReviewUrl || '';

  // Auto-close the success card after 10 s; also resets if the user reopens it
  useEffect(() => {
    if (!submitted) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setSubmitted(false);
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createRequest = useCreateServiceRequest();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      service: '',
      jobStreet: '',
      jobCity: '',
      jobZip: '',
      description: '',
      urgency: 'flexible',
      preferredDate: '',
      preferredTime: '',
    },
  });

  const urgency = useWatch({ control: form.control, name: 'urgency' });
  const preferredDate = useWatch({ control: form.control, name: 'preferredDate' });
  const preferredTime = useWatch({ control: form.control, name: 'preferredTime' });
  const minDate = todayDateKey();
  const openWindows = useMemo(
    () => availableTimeWindows(preferredDate || undefined),
    [preferredDate],
  );

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => revokePreviews(photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear a selected window if the date makes it unavailable.
  useEffect(() => {
    if (!preferredTime) return;
    if (
      preferredTime === 'morning' ||
      preferredTime === 'afternoon' ||
      preferredTime === 'evening'
    ) {
      if (!isTimeWindowAvailable(preferredTime, preferredDate || undefined)) {
        form.setValue('preferredTime', '');
      }
    }
  }, [preferredDate, preferredTime, form]);

  // ── Photo handlers ────────────────────────────────────────────────────────

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setPhotoError(null);
    const next = [...photos];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_PHOTOS) {
        setPhotoError(`You can upload up to ${MAX_PHOTOS} photos.`);
        break;
      }
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
        setPhotoError('Photos must be JPEG, PNG, or WebP.');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError('Each photo must be 5 MB or smaller.');
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setPhotoError(null);
  };

  // ── Video handlers ────────────────────────────────────────────────────────

  const addVideos = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setVideoError(null);
    const next = [...videos];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_VIDEOS) {
        setVideoError(`You can upload up to ${MAX_VIDEOS} videos.`);
        break;
      }
      if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
        setVideoError('Videos must be MP4, MOV, or WebM.');
        continue;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setVideoError('Each video must be 100 MB or smaller.');
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        sizeLabel: formatBytes(file.size),
      });
    }
    setVideos(next);
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setVideoError(null);
  };

  // ── Media dispatcher (routes by MIME type) ────────────────────────────────

  const addMedia = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const imageFiles = new DataTransfer();
    const videoFiles = new DataTransfer();
    for (const file of Array.from(fileList)) {
      if (file.type.startsWith('image/')) imageFiles.items.add(file);
      else videoFiles.items.add(file);
    }
    if (imageFiles.files.length) addPhotos(imageFiles.files);
    if (videoFiles.files.length) addVideos(videoFiles.files);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = (data: BookingFormData) => {
    createRequest.mutate(
      {
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          service: data.service,
          jobStreet: data.jobStreet.trim(),
          jobCity: data.jobCity.trim(),
          ...(data.jobZip?.trim() ? { jobZip: data.jobZip.trim() } : {}),
          description: data.description,
          urgency: data.urgency as Urgency,
          preferredDate: data.preferredDate || undefined,
          preferredTime: data.preferredTime as 'morning' | 'afternoon' | 'evening' | undefined,
          ...(photos.length ? { photos: photos.map((p) => p.file) } : {}),
          ...(videos.length ? { videos: videos.map((v) => v.file) } : {}),
        },
      },
      {
        onSuccess: () => {
          revokePreviews(photos);
          setPhotos([]);
          setVideos([]);
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetServiceRequestSummaryQueryKey() });
          toast({
            title: 'Request received!',
            description: 'Mike will review your request and confirm the time.',
          });
        },
        onError: () => {
          toast({
            variant: 'destructive',
            title: 'Something went wrong',
            description: 'Please try again or call directly.',
          });
        },
      },
    );
  };

  // ── Success state ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="relative text-center py-14 px-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl border-2 border-accent/20 shadow-xl overflow-hidden"
        data-testid="message-booking-success"
      >
        <button
          onClick={() => setSubmitted(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
          aria-label="Close confirmation"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-2xl glow-accent">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-3xl font-display font-bold mb-3 tracking-tight">Request Received</h3>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
          Mike will review your request and confirm the time. You'll get a notification once it's
          confirmed.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 text-accent font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          Pending owner confirmation
        </div>

        {googleReviewUrl && (
          <div className="mt-6">
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4285F4] text-white font-bold text-sm shadow-lg hover:bg-[#3367D6] transition-colors"
            >
              <Star className="w-4 h-4 fill-white" />
              Leave us a Google review
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        )}

        <div className="mt-8 space-y-1.5">
          <div className="h-1 rounded-full bg-accent/15 overflow-hidden">
            <div
              className="h-full bg-accent/50 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Closing in {countdown}s</p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7" data-testid="form-booking">
        {/* Name + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Smith"
                    {...field}
                    className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                    data-testid="input-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">Phone *</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...field}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    maxLength={14}
                    className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                    data-testid="input-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold text-foreground">Email *</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                  data-testid="input-email"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Needed so we can email you when Mike confirms your booking.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Service */}
        <FormField
          control={form.control}
          name="service"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold text-foreground">Service Needed *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                    data-testid="select-service"
                  >
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl border-2">
                  {services.map((service) => (
                    <SelectItem
                      key={service}
                      value={service}
                      className="font-medium py-3 rounded-lg"
                      data-testid={`option-service-${service}`}
                    >
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Job Location */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Job Location *
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mike needs the address to route his day. We only serve the Greater Austin Area.
            </p>
          </div>

          {/* Street address */}
          <FormField
            control={form.control}
            name="jobStreet"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground sr-only">
                  Street Address *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Street address"
                    {...field}
                    className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                    data-testid="input-job-street"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City + State badge + ZIP */}
          <div className="flex gap-2 items-start">
            {/* City */}
            <FormField
              control={form.control}
              name="jobCity"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <FormLabel className="sr-only">City *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City (e.g. Austin, Round Rock…)"
                      {...field}
                      className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                      data-testid="input-job-city"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Locked state badge */}
            <div
              className="flex items-center gap-1.5 h-12 px-3 border-2 rounded-xl bg-muted text-muted-foreground font-bold text-sm select-none shrink-0"
              aria-label="State: Texas (locked)"
              title="We only serve Texas"
            >
              <Lock className="w-3 h-3" />
              TX
            </div>

            {/* ZIP */}
            <FormField
              control={form.control}
              name="jobZip"
              render={({ field }) => (
                <FormItem className="w-24 shrink-0">
                  <FormLabel className="sr-only">ZIP (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ZIP"
                      inputMode="numeric"
                      maxLength={5}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="h-12 px-3 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all text-center"
                      data-testid="input-job-zip"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold text-foreground">Job Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what you need done. The more detail, the better!"
                  className="min-h-[120px] resize-none px-4 py-3 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                  {...field}
                  data-testid="input-description"
                />
              </FormControl>
              <VoiceInput
                label="your job description"
                testId="button-voice-description"
                onTranscript={(text) => {
                  const current = form.getValues('description');
                  form.setValue(
                    'description',
                    current ? `${current.trim()} ${text}` : text,
                    { shouldValidate: true, shouldDirty: true },
                  );
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Urgency */}
        <FormField
          control={form.control}
          name="urgency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-bold text-foreground">
                How soon do you need this?
              </FormLabel>
              <FormControl>
                <div
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="How soon do you need this?"
                >
                  {URGENCY_OPTIONS.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-testid={`option-urgency-${option.value}`}
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          'text-left rounded-xl border-2 px-4 py-3 transition-all',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40 bg-background',
                        )}
                      >
                        <span className="block font-display font-bold text-sm">{option.label}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormControl>
              {urgency === 'urgent' ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I'll prioritize when I'm available. For flooding, gas smells, fire, or anything
                  that feels unsafe, call 911 or a licensed emergency specialist.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Helps Mike know how to prioritize — not a guaranteed same-day visit.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Photos & Videos ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-bold text-foreground">Photos &amp; Videos (optional)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {MAX_PHOTOS} photos (JPEG/PNG/WebP · 5 MB) and {MAX_VIDEOS} videos (MP4/MOV/WebM · 100 MB).
            </p>
          </div>

          {/* Three action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => browseInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">Browse files</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">Snap a photo</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <Video className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground leading-tight">Record a video</span>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={browseInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            multiple
            className="sr-only"
            data-testid="input-media-browse"
            onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            data-testid="input-media-camera"
            onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            data-testid="input-media-video"
            onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }}
          />

          {/* Combined preview */}
          {(photos.length > 0 || videos.length > 0) && (
            <div className="space-y-3">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted"
                    >
                      <img
                        src={photo.previewUrl}
                        alt="Upload preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center shadow"
                        aria-label="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {videos.length > 0 && (
                <ul className="space-y-2">
                  {videos.map((video) => (
                    <li
                      key={video.id}
                      className="flex items-center gap-3 rounded-xl border-2 border-border bg-muted/30 px-4 py-3"
                    >
                      <Film className="w-5 h-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.name}</p>
                        <p className="text-xs text-muted-foreground">{video.sizeLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                        aria-label="Remove video"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Errors */}
          {photoError && <p className="text-sm text-destructive font-medium">{photoError}</p>}
          {videoError && <p className="text-sm text-destructive font-medium">{videoError}</p>}
        </div>

        {/* ── Date + Time ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="preferredDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">
                  Preferred Date (optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    min={minDate}
                    {...field}
                    className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                    data-testid="input-preferred-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferredTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-bold text-foreground">
                  Preferred Time Window (optional)
                </FormLabel>
                <Select
                  key={`${preferredDate ?? ''}-${openWindows.join('-')}`}
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                  disabled={openWindows.length === 0}
                >
                  <FormControl>
                    <SelectTrigger
                      className="h-12 px-4 border-2 rounded-xl font-medium focus:ring-2 focus:ring-ring transition-all"
                      data-testid="select-preferred-time"
                    >
                      <SelectValue
                        placeholder={
                          openWindows.length === 0 ? 'No windows left today' : 'Select time window'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-xl border-2">
                    {openWindows.map((window: TimeWindow) => (
                      <SelectItem
                        key={window}
                        value={window}
                        className="font-medium py-3 rounded-lg"
                        data-testid={`option-time-${window}`}
                      >
                        {TIME_WINDOW_LABELS[window]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {openWindows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    All time windows for today have passed — choose tomorrow or a later date.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only upcoming windows are shown for the selected day.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full font-display font-bold text-lg h-14 rounded-xl shadow-xl hover:shadow-2xl magnetic-hover glow-primary mt-8"
          disabled={createRequest.isPending}
          data-testid="button-submit-booking"
        >
          {createRequest.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-3" />
              Book a Service
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground font-semibold mt-6">
          Average response time: <span className="text-primary font-bold">41 minutes</span>
        </p>
      </form>
    </Form>
  );
}
