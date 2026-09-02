import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateReview, getListReviewsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/VoiceInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Copy, ExternalLink, Loader2, Sparkles, Star, X } from 'lucide-react';

const services = [
  'Electrical & Lighting',
  'Mounting & TV Installation',
  'Plumbing Services',
  'Furniture Assembly & Repair',
  'Home Repairs & Maintenance'
];

const NAME_RE = /^[A-Za-z\s'\-.]{2,}$/;

const reviewSchema = z.object({
  name: z
    .string()
    .min(2, 'Please enter your name (at least 2 characters)')
    .max(100, 'Name is too long')
    .regex(NAME_RE, 'Name should only contain letters, spaces, and hyphens'),
  location: z.string().optional(),
  service: z.string().optional(),
  rating: z.number().min(1, 'Please pick a star rating').max(5),
  text: z
    .string()
    .min(10, 'Please write at least a sentence about your experience')
    .max(2000, 'Review is too long — please keep it under 2000 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

/**
 * Copy text to the clipboard with a legacy fallback for browsers/contexts
 * where navigator.clipboard is unavailable (e.g. older mobile WebViews).
 * Returns true when the copy succeeded.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Open the Google write-review page in a new tab. Returns false when the
 * browser blocked the popup.
 * Note: we must NOT pass the "noopener" feature string — it makes
 * window.open return null even on success, which would break blocked-popup
 * detection. Instead we sever the opener reference manually.
 */
function openGoogle(url: string): boolean {
  const win = window.open(url, '_blank');
  if (win) {
    win.opener = null;
    return true;
  }
  return false;
}

interface ReviewFormProps {
  /**
   * Google "write a review" URL. When present, excellent reviews get a
   * prominent post-on-Google handoff after being saved; everyone else gets a
   * subtle Google link (policy-safe — the option is available to all).
   */
  googleWriteReviewUrl?: string;
}

type Phase = 'form' | 'celebrate' | 'thanks';

export function ReviewForm({ googleWriteReviewUrl }: ReviewFormProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [countdown, setCountdown] = useState(10);
  const [hovered, setHovered] = useState(0);
  // Celebration (Google handoff) state
  const [handedOff, setHandedOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const composedTextRef = useRef('');
  const resultCardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createReview = useCreateReview();

  // Move focus to the result card so screen readers announce it.
  useEffect(() => {
    if (phase !== 'form') resultCardRef.current?.focus();
  }, [phase, handedOff]);

  // Auto-close the plain thank-you card after 10 s.
  useEffect(() => {
    if (phase !== 'thanks') return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setPhase('form');
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { name: '', location: '', service: '', rating: 0, text: '' }
  });

  const resetToForm = () => {
    setPhase('form');
    setHandedOff(false);
    setPopupBlocked(false);
    setCopied(false);
    form.reset();
  };

  const onSubmit = (data: ReviewFormData) => {
    composedTextRef.current = data.text.trim();
    createReview.mutate(
      {
        data: {
          name: data.name,
          location: data.location || undefined,
          service: data.service || undefined,
          rating: data.rating,
          text: data.text
        }
      },
      {
        onSuccess: (created) => {
          queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
          const excellent = Boolean((created as { excellent?: boolean })?.excellent);
          setPhase(excellent && googleWriteReviewUrl ? 'celebrate' : 'thanks');
          // Clear the fields now so returning to the form starts fresh
          // (the composed text for the Google handoff lives in a ref).
          form.reset();
          toast({
            title: 'Review received',
            description: 'Thanks for sharing your experience!'
          });
        },
        onError: (err) => {
          // Surface the server's own message when it has one (e.g. the
          // rate limiter's "Too many reviews submitted. Please try again
          // later.") instead of a generic toast.
          const serverMessage =
            typeof err === 'object' && err !== null && 'data' in err
              ? (err as { data?: { error?: unknown } | null }).data?.error
              : undefined;
          toast({
            variant: 'destructive',
            title: 'Something went wrong',
            description:
              typeof serverMessage === 'string' && serverMessage.trim()
                ? serverMessage
                : 'Please try again in a moment.'
          });
        }
      }
    );
  };

  /**
   * "Post on Google" click: copy + open happen in the SAME user gesture so
   * popup blockers allow the new tab (unlike opening after the async save).
   */
  const postOnGoogle = () => {
    if (!googleWriteReviewUrl) return;
    const opened = openGoogle(googleWriteReviewUrl);
    setPopupBlocked(!opened);
    setHandedOff(true);
    void copyToClipboard(composedTextRef.current).then((ok) => {
      setCopied(ok);
      if (!ok) {
        toast({
          title: "Couldn't copy automatically",
          description: 'Use the "Copy review" button, then paste it on Google.'
        });
      }
    });
  };

  const recopy = async () => {
    const ok = await copyToClipboard(composedTextRef.current);
    setCopied(ok);
    toast(
      ok
        ? { title: 'Copied!', description: 'Now paste it into the Google review box.' }
        : {
            variant: 'destructive',
            title: "Couldn't copy",
            description: 'Please select your review text below and copy it manually.'
          }
    );
  };

  // ── Celebration: excellent review + Google configured ──────────────────────
  if (phase === 'celebrate') {
    return (
      <div
        ref={resultCardRef}
        tabIndex={-1}
        role="status"
        className="relative text-center py-10 px-6 sm:px-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl border-2 border-accent/20 shadow-xl overflow-hidden outline-none"
        data-testid="message-review-celebration"
      >
        <button
          onClick={resetToForm}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
          aria-label="Close confirmation"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center mx-auto mb-5 shadow-2xl glow-accent animate-in zoom-in duration-500">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        {!handedOff ? (
          <>
            <h3 className="text-2xl font-display font-bold mb-2 tracking-tight">
              Wow — thank you! Your review made our day.
            </h3>
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto" data-testid="text-handoff-guidance">
              It's saved — Mike will feature it on the site soon. Reviews like yours help neighbors find
              Mike on Google — mind sharing it there too? One tap: we'll copy your words and open
              Google's review page. Just paste and post.
            </p>

            <blockquote
              className="mt-6 text-left text-sm bg-background/70 border border-border rounded-xl p-4 max-w-md mx-auto whitespace-pre-wrap select-all"
              data-testid="text-composed-review"
            >
              {composedTextRef.current}
            </blockquote>

            <div className="mt-6">
              <Button size="lg" onClick={postOnGoogle} data-testid="button-post-on-google">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.62 3.9-5.35 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.85-3.65 8.85-8.8 0-.37-.03-.74-.1-1.1Z" />
                </svg>
                Post it on Google
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">Takes about 15 seconds — Google may ask you to sign in.</p>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-display font-bold mb-2 tracking-tight">
              {copied ? 'Your review is copied!' : 'Almost there!'}
            </h3>
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto" data-testid="text-handoff-guidance">
              {popupBlocked
                ? `Your browser blocked the Google window — tap "Open Google Reviews" below, then paste your review there and tap Post. Google may ask you to sign in first.`
                : copied
                  ? 'A Google review window just opened — paste your review there and tap Post. Google may ask you to sign in first.'
                  : 'A Google review window just opened. Copy your review below, paste it there, and tap Post. Google may ask you to sign in first.'}
            </p>

            {/* The composed review, visible so it can be selected manually if needed */}
            <blockquote
              className="mt-6 text-left text-sm bg-background/70 border border-border rounded-xl p-4 max-w-md mx-auto whitespace-pre-wrap select-all"
              data-testid="text-composed-review"
            >
              {composedTextRef.current}
            </blockquote>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => setPopupBlocked(!openGoogle(googleWriteReviewUrl!))}
                data-testid="button-reopen-google"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Google Reviews
              </Button>
              <Button size="lg" variant="outline" onClick={recopy} data-testid="button-copy-again">
                <Copy className="w-4 h-4 mr-2" />
                Copy review again
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Thank-you: stored on site (with a subtle, policy-safe Google link) ─────
  if (phase === 'thanks') {
    return (
      <div
        ref={resultCardRef}
        tabIndex={-1}
        role="status"
        className="relative text-center py-12 px-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl border-2 border-accent/20 shadow-xl overflow-hidden outline-none"
        data-testid="message-review-success"
      >
        {/* Close button */}
        <button
          onClick={resetToForm}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
          aria-label="Close confirmation"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center mx-auto mb-5 shadow-2xl glow-accent">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-display font-bold mb-2 tracking-tight">Thanks for the review!</h3>
        <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
          Your feedback means a lot. Mike will feature it in the client reviews above soon.
        </p>

        {googleWriteReviewUrl && (
          <p className="mt-4 text-sm text-muted-foreground">
            You can also{' '}
            <a
              href={googleWriteReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              data-testid="link-google-review-subtle"
            >
              share your experience on Google
            </a>
            .
          </p>
        )}

        {/* Countdown bar */}
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

  const ratingValue = form.watch('rating');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-review">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel id="review-rating-label">Your rating</FormLabel>
              <FormControl>
                <div
                  className="flex gap-2"
                  role="radiogroup"
                  aria-labelledby="review-rating-label"
                  onMouseLeave={() => setHovered(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={ratingValue === star}
                      tabIndex={star === (ratingValue || 1) ? 0 : -1}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      data-testid={`button-rating-${star}`}
                      onMouseEnter={() => setHovered(star)}
                      onClick={() => field.onChange(star)}
                      onKeyDown={(e) => {
                        let next: number | null = null;
                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, (ratingValue || 0) + 1);
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, (ratingValue || 2) - 1);
                        if (next !== null) {
                          e.preventDefault();
                          field.onChange(next);
                          (e.currentTarget.parentElement?.children[next - 1] as HTMLElement)?.focus();
                        }
                      }}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hovered || ratingValue)
                            ? 'text-accent fill-accent'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" data-testid="input-review-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Austin, TX" data-testid="input-review-location" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="service"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service (optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-review-service">
                    <SelectValue placeholder="Which service did you use?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your review</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="How did it go? What was fixed, mounted, or installed?"
                  data-testid="input-review-text"
                  {...field}
                />
              </FormControl>
              <VoiceInput
                label="your review"
                testId="button-voice-review"
                onTranscript={(text) => {
                  const current = form.getValues('text');
                  form.setValue('text', current ? `${current.trim()} ${text}` : text, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          disabled={createReview.isPending}
          data-testid="button-submit-review"
          className="w-full sm:w-auto"
        >
          {createReview.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            'Share my review'
          )}
        </Button>
      </form>
    </Form>
  );
}
