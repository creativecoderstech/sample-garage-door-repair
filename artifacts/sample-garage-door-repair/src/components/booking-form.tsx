import { useState, useRef, useEffect } from 'react';
import { useCreateServiceRequest, type ServiceRequestInput } from '@workspace/api-client-react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarCheck, MapPin, Upload, Camera, Video, X, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "@/components/voice-input";
import { getInvisibleTurnstileToken } from "@/lib/cloudflare-turnstile";
import { trackGarageEvent } from "@/lib/garage-analytics";
import {
  consumeServiceRequestDraft,
  SERVICE_REQUEST_DRAFT_EVENT,
  type ServiceRequestDraft,
} from "@/components/customer-care-chat";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_VIDEOS = 2;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

const TIME_WINDOW_LABELS = {
  morning: 'Morning (8am - 12pm)',
  afternoon: 'Afternoon (12pm - 4pm)',
  evening: 'Evening (4pm - 8pm)',
};

const URGENCY_OPTIONS = [
  { value: 'flexible', label: 'Flexible', hint: 'Whenever works' },
  { value: 'soon', label: 'This week', hint: 'Prefer sooner' },
  { value: 'emergency', label: 'Urgent', hint: 'Need help quickly' },
];

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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function revokePreviews(items: PhotoItem[]) {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

const bookingSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Valid phone is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
  streetAddress: z.string().min(3, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Enter a two-letter state"),
  zip: z.string().min(5, "ZIP code is required"),
  service: z.string().min(2, "Service type is required"),
  urgency: z.enum(["emergency", "soon", "flexible"]),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  details: z.string().min(10, "Please briefly describe the garage door issue"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export function BookingForm({ className = "" }: { className?: string }) {
  const { toast } = useToast();
  const createRequest = useCreateServiceRequest();
  const [assistantDraft, setAssistantDraft] = useState(() => consumeServiceRequestDraft());
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      streetAddress: "",
      city: "",
      state: "GA",
      zip: "",
      service: assistantDraft?.service || "repair",
      urgency: assistantDraft?.urgency || "flexible",
      preferredDate: "",
      preferredTime: "",
      details: assistantDraft?.details || "",
    }
  });

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  const bookingStartedRef = useRef(false);

  const browseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    const applyAssistantDraft = (event: Event) => {
      const eventDraft = (event as CustomEvent<Partial<ServiceRequestDraft>>).detail;
      const draft = consumeServiceRequestDraft() ?? eventDraft;
      if (!draft) return;

      setAssistantDraft(draft);
      if (draft.service) form.setValue("service", draft.service, { shouldDirty: true });
      if (draft.urgency) form.setValue("urgency", draft.urgency, { shouldDirty: true });
      if (draft.details) form.setValue("details", draft.details, { shouldDirty: true });
    };

    window.addEventListener(SERVICE_REQUEST_DRAFT_EVENT, applyAssistantDraft);
    return () => window.removeEventListener(SERVICE_REQUEST_DRAFT_EVENT, applyAssistantDraft);
  }, [form]);

  useEffect(() => () => revokePreviews(photosRef.current), []);

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

  const trackBookingStart = () => {
    if (bookingStartedRef.current) return;
    bookingStartedRef.current = true;
    trackGarageEvent("booking_start");
  };

  const onSubmit = async (values: BookingFormValues) => {
    trackBookingStart();
    let turnstileToken: string | undefined;
    try {
      turnstileToken = await getInvisibleTurnstileToken("booking");
    } catch {
      toast({
        title: "Verification needed",
        description: "We couldn’t verify this request. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    let combinedDetails = values.details || "";

    if (photos.length > 0 || videos.length > 0) {
      combinedDetails = `${combinedDetails}\n\n[Media note: Customer selected ${photos.length} photo(s) and ${videos.length} video(s) for local preview. The files were not uploaded or sent with this request.]`.trim();
    }

    const data: ServiceRequestInput & { turnstileToken?: string } = {
      customerName: values.customerName,
      phone: values.phone,
      email: values.email || "",
      streetAddress: values.streetAddress,
      city: values.city,
      state: values.state.toUpperCase(),
      zip: values.zip,
      service: values.service,
      urgency: values.urgency,
      preferredDate: values.preferredDate || new Date().toISOString().split('T')[0],
      preferredTime: values.preferredTime || "",
      details: combinedDetails,
      ...(turnstileToken ? { turnstileToken } : {}),
    };

    createRequest.mutate({ data: data as ServiceRequestInput }, {
      onSuccess: () => {
        toast({
          title: "Request Received!",
          description: "Your request was sent. The business must confirm coverage, timing, and any appointment.",
        });
        form.reset();
        revokePreviews(photos);
        setPhotos([]);
        setVideos([]);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again later.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className={cn("phi-booking-card phi-card bg-card border shadow-xl overflow-hidden", className)}>
      <div className="phi-booking-header bg-primary text-primary-foreground">
         <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <CalendarCheck className="w-6 h-6" /> Book Service
         </h2>
         <p className="text-primary-foreground/80 mt-2 text-sm">This sends a request, not a confirmed appointment. Coverage and timing are confirmed by the business.</p>
      </div>
      {assistantDraft && (
        <div className="mx-6 mt-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Customer care notes added.</span>{" "}
          We carried your conversation into the request so you can review it and add your contact details.
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} onFocusCapture={trackBookingStart} className="p-[var(--phi-space-4)] sm:p-[var(--phi-space-5)] space-y-[var(--phi-space-4)]">
           <section aria-labelledby="contact-heading" className="space-y-4">
             <div>
                <h3 id="contact-heading" className="font-display text-lg font-bold">1. Your contact details</h3>
               <p className="mt-1 text-sm text-muted-foreground">Used to respond to this request. A submission is not a confirmed appointment.</p>
             </div>
          <div className="phi-field-grid grid grid-cols-1 sm:grid-cols-2">
            <FormField control={form.control} name="customerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                 <FormControl><Input placeholder="Full name" autoComplete="name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl><Input type="tel" placeholder="Phone number" autoComplete="tel" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="phi-field-grid grid grid-cols-1 sm:grid-cols-2">
             <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                 <FormControl><Input type="email" placeholder="name@example.com" autoComplete="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
           </section>

           <section aria-labelledby="location-heading" className="space-y-3">
            <div>
               <h3 id="location-heading" className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                  2. Job address
               </h3>
               <p id="address-help" className="text-sm text-muted-foreground mt-1">
                 The complete address is required only to send this request. It is used to review routing and confirm coverage; it does not confirm a visit.
              </p>
            </div>
            <FormField control={form.control} name="streetAddress" render={({ field }) => (
              <FormItem>
                 <FormLabel>Street address *</FormLabel>
                <FormControl>
                   <Input placeholder="Street address" autoComplete="street-address" aria-describedby="address-help" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                   <FormLabel>City *</FormLabel>
                  <FormControl><Input placeholder="City" autoComplete="address-level2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                   <FormLabel>State *</FormLabel>
                  <FormControl>
                    <Input
                       placeholder="GA"
                      autoComplete="address-level1"
                      maxLength={2}
                      className="text-center uppercase"
                      {...field}
                      onChange={(event) => field.onChange(event.target.value.replace(/[^a-z]/gi, '').toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="zip" render={({ field }) => (
                 <FormItem>
                   <FormLabel>ZIP code *</FormLabel>
                   <FormControl>
                     <Input
                       placeholder="ZIP code"
                       inputMode="numeric"
                       autoComplete="postal-code"
                       aria-describedby="address-help"
                       {...field}
                       maxLength={5}
                       onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 5))}
                     />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )} />
            </div>
           </section>

          <FormField control={form.control} name="service" render={({ field }) => (
            <FormItem>
              <FormLabel>Service Needed *</FormLabel>
               <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="repair">General Repair</SelectItem>
                  <SelectItem value="springs">Broken Springs</SelectItem>
                  <SelectItem value="opener">Opener Issues</SelectItem>
                  <SelectItem value="installation">New Door Installation</SelectItem>
                  <SelectItem value="maintenance">Routine Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
               <FormLabel id="urgency-label">How soon do you need this?</FormLabel>
                <FormControl>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--phi-space-2)]"
                    role="radiogroup"
                     aria-labelledby="urgency-label"
                  >
                    {URGENCY_OPTIONS.map((option) => {
                      const selected = field.value === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'text-left rounded-xl border-2 px-4 py-3 transition-all',
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/40 bg-background',
                          )}
                        >
                          <span className="block font-bold text-sm">{option.label}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Helps us prioritize your request — not a guaranteed same-day visit. Do not operate a crooked, hanging, or spring-damaged door.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="phi-field-grid grid grid-cols-1 sm:grid-cols-2">
            <FormField control={form.control} name="preferredDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Date (Optional)</FormLabel>
                <FormControl><Input type="date" min={new Date().toISOString().split('T')[0]} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="preferredTime" render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Time (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Any time" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TIME_WINDOW_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="details" render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description *</FormLabel>
               <FormDescription>Do not include passwords, payment-card details, or other sensitive information.</FormDescription>
              <FormControl>
                <Textarea
                  placeholder="Describe what you need done. The more detail, the better!"
                  className="resize-none min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <VoiceInput
                onTranscript={(text) => {
                  const current = form.getValues('details');
                  form.setValue(
                    'details',
                    current ? `${current.trim()} ${text}` : text,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
              <FormMessage />
            </FormItem>
          )} />

           <section aria-labelledby="media-heading" className="space-y-3">
            <div>
               <h3 id="media-heading" className="font-display text-lg font-bold text-foreground">Photos &amp; Videos (Optional)</h3>
               <p id="media-help" className="text-sm text-muted-foreground mt-1">
                 Selected files are previewed only in this browser tab. They are not uploaded, retained, or sent with the request. The request notes only how many files you selected.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-[var(--phi-space-2)]">
              <button
                type="button"
                 aria-describedby="media-help media-status"
                onClick={() => browseInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground leading-tight">Browse files</span>
              </button>

              <button
                type="button"
                 aria-describedby="media-help media-status"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground leading-tight">Snap a photo</span>
              </button>

              <button
                type="button"
                 aria-describedby="media-help media-status"
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-2 py-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <Video className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground leading-tight">Record video</span>
              </button>
            </div>

             {(photoError || videoError) && (
               <div id="media-errors" role="alert" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                {photoError && <div>{photoError}</div>}
                {videoError && <div>{videoError}</div>}
              </div>
            )}

            <input
              type="file"
               aria-label="Choose photos or videos for local preview"
               aria-describedby="media-help"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
              className="hidden"
              ref={browseInputRef}
              onChange={(e) => {
                addMedia(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              type="file"
               aria-label="Take a photo for local preview"
               aria-describedby="media-help"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              type="file"
               aria-label="Record a video for local preview"
               aria-describedby="media-help"
              accept="video/mp4,video/quicktime,video/webm"
              capture="environment"
              className="hidden"
              ref={videoInputRef}
              onChange={(e) => {
                addVideos(e.target.files);
                e.target.value = '';
              }}
            />

             <p id="media-status" role="status" aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">
               {photos.length + videos.length === 0
                 ? "No local media selected."
                 : `${photos.length} photo${photos.length === 1 ? "" : "s"} and ${videos.length} video${videos.length === 1 ? "" : "s"} selected locally; none will be uploaded.`}
             </p>

             {photos.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Photos ({photos.length}/{MAX_PHOTOS})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border bg-muted/50"
                    >
                       <img src={photo.previewUrl} alt={`Local preview of ${photo.file.name}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                           aria-label={`Remove ${photo.file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Videos ({videos.length}/{MAX_VIDEOS})
                </p>
                <div className="space-y-2">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-muted/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{video.name}</p>
                          <p className="text-xs text-muted-foreground">{video.sizeLabel}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="w-8 h-8 shrink-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                       aria-label={`Remove ${video.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                     </div>
                  ))}
                </div>
              </div>
            )}
           </section>

          <Button type="submit" size="lg" className="w-full font-bold text-lg min-h-[var(--phi-control)] py-4 mt-4 shadow-md glow-primary" disabled={createRequest.isPending}>
             {createRequest.isPending ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /><span>Sending request…</span></> : "Request Service"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
