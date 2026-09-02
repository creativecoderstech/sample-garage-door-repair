import { useEffect, useRef, useState } from 'react';
import { useGetGoogleReviewFeed, useListGarageServices, useListTestimonials, useGetBusinessSettings } from '@workspace/api-client-react';
import type { GoogleReviewFeed, Testimonial } from '@workspace/api-client-react';
import { SiGoogle } from 'react-icons/si';
import { useListFaqs, useListTasks } from '@/lib/demo-store';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { BookingForm } from '@/components/booking-form';
import { 
  Shield, 
  Clock, 
  Star, 
  CheckCircle2, 
  Wrench, 
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Phone
} from 'lucide-react';

const defaultGalleryImages = [
  "/images/garage/modern-white-home.jpg",
  "/images/garage/classic-white-door.jpg",
  "/images/garage/evening-home.jpg",
  "/images/garage/double-garage-home.jpg",
  "/images/garage/gallery/garage-modern-building.jpg",
  "/images/garage/gallery/garage-white-house.jpg",
  "/images/garage/gallery/garage-wood-panel.jpg",
  "/images/garage/gallery/garage-interior-ev.jpg",
];

export default function HomePage() {
  const { data: settings } = useGetBusinessSettings();
  const { data: services } = useListGarageServices();
  const { data: testimonials } = useListTestimonials();
  const { data: googleFeed, isLoading: isLoadingReviews, isError: isErrorReviews } = useGetGoogleReviewFeed();
  const { data: faqs } = useListFaqs();
  const { data: tasks } = useListTasks();
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showQuickRequest, setShowQuickRequest] = useState(false);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [showAllBeforeAfter, setShowAllBeforeAfter] = useState(false);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-fade, .reveal-scale');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [services, testimonials, faqs, tasks]);

  useEffect(() => {
    const booking = document.getElementById('booking');
    if (!booking) return;

    let bookingVisible = false;
    const sync = () => {
      setShowQuickRequest(window.scrollY > 420 && !bookingVisible);
    };

    const bookingObserver = new IntersectionObserver(
      ([entry]) => {
        bookingVisible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    bookingObserver.observe(booking);
    window.addEventListener('scroll', sync, { passive: true });
    sync();

    return () => {
      bookingObserver.disconnect();
      window.removeEventListener('scroll', sync);
    };
  }, []);

  const heroImage = settings?.heroImage || "/images/garage/hero-door-forward.jpg";
  const galleryImages = settings?.galleryImages?.length
    ? settings.galleryImages
    : defaultGalleryImages;
  const topServices = services?.slice(0, 3) || [];
  const visibleGalleryImages = showAllGallery ? galleryImages : galleryImages.slice(0, 4);
  const visibleBeforeAfterTasks = showAllBeforeAfter ? (tasks || []) : (tasks || []).slice(0, 2);
  
  return (
    <div className="min-h-screen bg-background noise-overlay" id="main-content">
      {/* HERO SECTION */}
      <section id="hero" className="relative overflow-hidden">
        {/* Mobile View */}
        <div className="lg:hidden relative" style={{ minHeight: 'calc(100svh - 3.75rem)' }}>
          <div className="absolute inset-0 w-full h-full">
            <img src={heroImage} alt="Three premium residential garage doors on a Georgia craftsman home" className="w-full h-full object-cover object-[62%_center]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/25" />
          
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3 h-3 shrink-0" />
              Fully Licensed & Insured
            </div>
            <h1 className="font-display font-bold text-4xl leading-[1.1] tracking-tight text-white">
              Don't let a broken door <span className="text-primary">hold your day hostage.</span>
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Fast, professional garage door repair and installation. We secure your home's largest moving object so you can get back to life.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild size="lg" className="flex-1 font-display font-bold shadow-xl glow-primary">
                <a href="#booking">Book Now</a>
              </Button>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce z-10">
            <ChevronDown className="w-5 h-5 text-white/50" />
          </div>
        </div>

        {/* Desktop View */}
        <div className="relative hidden min-h-[720px] border-b lg:flex lg:items-center">
          <img
            src={heroImage}
            alt="Three premium residential garage doors on a Georgia craftsman home"
            className="absolute inset-0 h-full w-full object-cover object-[center_60%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-black/10" />

          <div className="container relative z-10 mx-auto px-12 py-20">
            <div className="max-w-2xl reveal-on-scroll">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                Local & Trusted Experts
              </div>
              <h1 className="mb-6 font-display text-6xl font-bold leading-[1.02] tracking-tight text-white xl:text-7xl">
                Don't let a broken door <br /><span className="text-primary">hold your day hostage.</span>
              </h1>
              <p className="mb-10 max-w-xl text-xl leading-relaxed text-white/78">
                Fast, professional garage door repair and installation. We secure your home's largest moving object so you can get back to life.
              </p>
              <div className="mb-10 flex gap-4">
                <Button asChild size="lg" className="h-14 px-8 font-display text-lg font-bold shadow-2xl glow-primary hover-elevate">
                  <a href="#booking">Book Service Now</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 border-2 border-white/60 bg-white/10 px-8 font-display text-lg font-bold text-white backdrop-blur-sm hover:bg-white hover:text-slate-950">
                  <a href="#services">Our Services</a>
                </Button>
              </div>
              <div className="grid max-w-xl grid-cols-2 gap-4 border-t border-white/25 pt-6 text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Same-Day Service</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Fully Insured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 reveal-on-scroll">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">Our Core Services</h2>
              <p className="text-muted-foreground text-lg max-w-2xl">Expert solutions for every component of your garage door system.</p>
            </div>
            <Button variant="ghost" asChild className="font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10">
              <Link href="/services">See full catalog <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topServices.map((service, i) => (
              <div key={service.id} className="group bg-card border rounded-2xl p-8 hover-elevate transition-all duration-300 flex flex-col h-full reveal-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                  <Wrench className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
                <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                  <span className="font-bold text-lg">From ${service.startingPrice}</span>
                  <Button variant="ghost" size="sm" asChild className="rounded-full">
                    <a href="#booking">Book <ChevronRight className="h-4 w-4 ml-1"/></a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY TEASER */}
      <section id="work" className="py-24 border-y bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll">
              <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Recent Field Work</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Doors we’re proud to stand behind</h2>
            </div>
             <div id="full-gallery-grid" className="gallery-grid reveal-on-scroll">
               {visibleGalleryImages.map((img, i) => (
                <figure key={i} className="gallery-tile">
                  <img src={img} alt={`Garage door project ${i + 1}`} loading="lazy" />
                </figure>
              ))}
            </div>
             {galleryImages.length > 4 && (
               <div className="mt-12 text-center reveal-on-scroll">
                 <Button
                   type="button"
                   variant="outline"
                   size="lg"
                   className="font-display font-bold hover-elevate"
                   aria-expanded={showAllGallery}
                   aria-controls="full-gallery-grid"
                   onClick={() => setShowAllGallery((expanded) => !expanded)}
                 >
                   {showAllGallery ? 'Show Featured Gallery' : 'View Full Gallery'}
                   <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAllGallery ? 'rotate-180' : ''}`} />
                 </Button>
               </div>
             )}
          </div>
      </section>

      {/* BEFORE & AFTER */}
      <section id="before-after" className="py-24 bg-muted/20 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 reveal-on-scroll">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Real Transformations</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">See the difference a new door makes</h2>
              <p className="text-muted-foreground text-lg">Matched photographs show the same properties before and after their garage-door upgrades.</p>
            </div>
             {tasks && tasks.length > 2 && (
               <Button
                 type="button"
                 variant="outline"
                 className="font-display font-bold shrink-0"
                 aria-expanded={showAllBeforeAfter}
                 aria-controls="full-before-after-grid"
                 onClick={() => setShowAllBeforeAfter((expanded) => !expanded)}
               >
                 {showAllBeforeAfter ? 'Show Featured Transformations' : 'View All Transformations'}
                 <ArrowRight className={`ml-2 h-4 w-4 transition-transform ${showAllBeforeAfter ? 'rotate-90' : ''}`} />
               </Button>
             )}
          </div>

           <div id="full-before-after-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-6 reveal-on-scroll">
             {visibleBeforeAfterTasks.map((task) => (
              <article key={task.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="grid grid-cols-2 h-56 sm:h-72">
                  <figure className="relative border-r">
                    <img src={task.beforeImageUrl} alt={`${task.title} before`} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-full bg-destructive px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">Before</span>
                  </figure>
                  <figure className="relative">
                    <img src={task.afterImageUrl} alt={`${task.title} after`} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">After</span>
                  </figure>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold">{task.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section className="py-24 bg-muted/20 border-b relative overflow-hidden" id="booking">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="max-w-2xl mx-auto reveal-on-scroll">
            <BookingForm />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="hidden py-24 bg-background border-b md:block" id="testimonials">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="max-w-2xl mb-12 reveal-on-scroll">
            <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Customer Stories</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight mb-8">What our neighbors say</h2>
          </div>
          <GoogleReviewsPresentation feed={googleFeed} isLoading={isLoadingReviews} isError={isErrorReviews} fallbackTestimonials={testimonials} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/10" id="faq">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="max-w-4xl mx-auto reveal-on-scroll">
            <div className="flex items-end justify-between gap-5 mb-10">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Helpful Answers</p>
                <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight">Frequently Asked Questions</h2>
              </div>
              <Link href="/faqs" className="hidden sm:inline-flex text-sm font-bold text-primary hover:underline shrink-0">View all FAQs</Link>
            </div>
            <div className="space-y-3">
              {faqs?.slice(0, 6).map((faq) => (
                <div 
                  key={faq.id} 
                  className={`border rounded-xl bg-card overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'shadow-md border-primary/30' : 'hover:border-border/80'}`}
                >
                  <button
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold"
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  >
                    {faq.question}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  <div className={`px-6 overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/faqs" className="sm:hidden mt-7 inline-flex text-sm font-bold text-primary hover:underline">View all FAQs</Link>
          </div>
        </div>
      </section>
      
      {/* Mobile Quick Action Button */}
      <div 
        className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showQuickRequest ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
        }`}
      >
        <Button asChild size="lg" className="h-14 px-8 font-display font-bold shadow-2xl glow-primary rounded-full min-w-[200px]">
          <a href="#booking">Book Now</a>
        </Button>
      </div>
    </div>
  );
}

function GoogleReviewsPresentation({
  feed,
  isLoading,
  isError,
  fallbackTestimonials,
}: {
  feed: GoogleReviewFeed | undefined;
  isLoading: boolean;
  isError: boolean;
  fallbackTestimonials: Testimonial[] | undefined;
}) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-32 w-full bg-muted/30 animate-pulse rounded-3xl border border-border/50"></div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl border border-border/50"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-12 bg-muted/10 rounded-3xl border border-border/50 text-muted-foreground">
        Unable to load reviews.
      </div>
    );
  }

  const isDisconnected = feed?.mode === 'live' && feed?.connectionStatus !== 'connected';
  const hasNoReviews = !feed || !feed.reviews || feed.reviews.length === 0;

  if (isDisconnected || hasNoReviews) {
    if (fallbackTestimonials && fallbackTestimonials.length > 0) {
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-on-scroll">
          {fallbackTestimonials.slice(0, 4).map((review) => (
            <div key={review.id} className="bg-card border rounded-2xl p-7 shadow-sm hover-elevate flex flex-col">
              <div className="flex gap-1 mb-5 text-[#FBBC04]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-muted/30 stroke-current'}`} />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-7">"{review.quote}"</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.city} • {review.service}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="text-center p-12 bg-muted/10 rounded-3xl border border-border/50 text-muted-foreground">
        No reviews available at this time.
      </div>
    );
  }

  return (
    <div className="space-y-10 reveal-on-scroll">
      {/* Aggregate Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between rounded-3xl bg-card border p-5 sm:gap-8 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
        {feed.mode === 'demo' && (
          <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl z-10 border-b border-l border-primary/20">
            Preview Data
          </div>
        )}
        <div className="relative z-10 flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-50 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-800 sm:h-20 sm:w-20">
            <SiGoogle className="h-8 w-8 text-slate-700 dark:text-slate-300 sm:h-10 sm:w-10" />
          </div>
          <div className="min-w-0 max-w-full">
            <div className="mb-2 flex max-w-full flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-display text-5xl font-bold tracking-tight text-foreground">{feed.aggregateRating.toFixed(1)}</span>
              <div className="flex shrink-0 gap-1 text-[#FBBC04]" aria-label={`${feed.aggregateRating.toFixed(1)} out of 5 stars`}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-6 w-6 ${i < Math.round(feed.aggregateRating) ? 'fill-current' : 'text-muted/30 stroke-current'}`} />
                ))}
              </div>
            </div>
            <p className="break-words text-sm font-medium text-muted-foreground">
              {feed.mode === 'demo' ? 'Previewing' : 'Based on'} {feed.totalReviewCount} Google reviews for <strong className="text-foreground">{feed.locationName}</strong>
            </p>
          </div>
        </div>
        {feed.profileUrl && (
          <Button variant="outline" size="lg" className="relative z-10 h-12 w-full shrink-0 rounded-xl border-border/60 px-8 font-display font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 md:h-14 md:w-auto" asChild>
            <a href={feed.profileUrl} target="_blank" rel="noopener noreferrer">Review us on Google</a>
          </Button>
        )}
      </div>

      {/* Reviews Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feed.reviews.map((review) => (
          <div key={review.id} className="bg-card border rounded-3xl p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover-elevate flex flex-col relative group transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {review.reviewerPhotoUrl ? (
                  <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="w-12 h-12 rounded-full bg-muted object-cover shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold font-display text-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    {review.reviewerName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-base leading-tight text-foreground">{review.reviewerName}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">{review.relativeTime}</p>
                </div>
              </div>
              <SiGoogle className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors" />
            </div>

            <div className="flex gap-0.5 mb-5 text-[#FBBC04]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-muted/30 stroke-current'}`} />
              ))}
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">"{review.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}