import { useEffect, useRef, useState } from 'react';
import { useGetGoogleReviewFeed, useGetPublicBusinessSettings } from '@workspace/api-client-react';
import type { GoogleReviewFeed } from '@workspace/api-client-react';
import { SiGoogle } from 'react-icons/si';
import { useListFaqs, useListPublishedGarageServices, useListTasks } from '@/lib/demo-store';
import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/booking-form';
import { ServiceAreaSection } from '@/components/service-area-section';
import { trackGarageEvent } from '@/lib/garage-analytics';
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
  const { data: settings } = useGetPublicBusinessSettings();
  const { data: services } = useListPublishedGarageServices();
  const { data: googleFeed, isLoading: isLoadingReviews, isError: isErrorReviews } = useGetGoogleReviewFeed();
  const { data: faqs } = useListFaqs();
  const { data: tasks } = useListTasks();
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showQuickRequest, setShowQuickRequest] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [showAllBeforeAfter, setShowAllBeforeAfter] = useState(false);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

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
  }, [services, faqs, tasks]);

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

  useEffect(() => {
    const servicesSection = document.getElementById("services");
    if (!servicesSection) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      trackGarageEvent("service_view");
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(servicesSection);
    return () => observer.disconnect();
  }, []);

  const heroImage = settings?.heroImage || "/images/garage/hero-door-forward.jpg";
  const galleryImages = settings?.galleryImages?.length
    ? settings.galleryImages
    : defaultGalleryImages;
  const topServices = services?.slice(0, 3) || [];
  const visibleServices = showAllServices ? (services || []) : topServices;
  const visibleGalleryImages = showAllGallery ? galleryImages : galleryImages.slice(0, 4);
  const visibleBeforeAfterTasks = showAllBeforeAfter ? (tasks || []) : (tasks || []).slice(0, 2);
  const visibleFaqs = showAllFaqs ? (faqs || []) : (faqs || []).slice(0, 6);
  const isVerified = settings?.verificationStatus === 'verified';
  const trustItems = settings?.trustProfile
    ? [
        ['Hours', settings.trustProfile.hours],
        ['Owner & team', settings.trustProfile.ownerTeam],
        ['Years in business', settings.trustProfile.yearsInBusiness],
        ['Brands serviced', settings.trustProfile.brandsServiced],
        ['Payment options', settings.trustProfile.paymentOptions],
        ['Financing', settings.trustProfile.financing],
        ['License & insurance', settings.trustProfile.licenseInsurance],
        ['Warranty', settings.trustProfile.warranty],
      ].filter((item): item is [string, string] => Boolean(item[1]))
    : [];
  
  return (
    <div className="min-h-screen bg-background noise-overlay">
      {/* HERO SECTION */}
      <section id="hero" data-cc-section="hero" data-cc-label="Hero Banner" className="relative overflow-hidden">
        {/* Mobile View */}
        <div className="phi-hero lg:hidden relative">
          <div className="absolute inset-0 w-full h-full">
             <img src={heroImage} alt="Representative residential garage-door design" className="w-full h-full object-cover object-[62%_center]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/25" />
          
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3 h-3 shrink-0" />
               {isVerified ? 'Verified business profile' : 'Website preview — details unverified'}
            </div>
            <h1 className="phi-hero-title text-white">
              Don't let a broken door <span className="text-primary">hold your day hostage.</span>
            </h1>
            <p className="pr-[var(--phi-space-4)] text-white/80 text-sm leading-relaxed">
               Request garage-door service information and scheduling. Coverage, timing, credentials, and final pricing are confirmed by the business.
            </p>
            <div className="flex gap-3 pt-2 pr-[var(--phi-space-5)]">
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
        <div className="phi-hero relative hidden border-b lg:flex lg:items-center">
          <img
            src={heroImage}
            alt="Representative residential garage-door design"
            className="absolute inset-0 h-full w-full object-cover object-[center_60%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-black/10" />

          <div className="phi-container relative z-10 py-[var(--phi-space-7)]">
            <div className="max-w-2xl reveal-on-scroll">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                 {isVerified ? 'Verified business information' : 'Website preview — business details pending'}
              </div>
              <h1 className="phi-hero-title mb-6 text-white">
                Don't let a broken door <br /><span className="text-primary">hold your day hostage.</span>
              </h1>
              <p className="mb-10 max-w-xl text-xl leading-relaxed text-white/78">
                 Explore repair and installation options, then send a request for the business to confirm coverage, timing, and pricing.
              </p>
              <div className="mb-[var(--phi-space-5)] flex gap-[var(--phi-space-3)]">
                <Button asChild size="lg" className="h-14 px-8 font-display text-lg font-bold shadow-2xl glow-primary hover-elevate">
                  <a href="#booking">Book Service Now</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-14 border-2 border-white/60 bg-white/10 px-8 font-display text-lg font-bold text-white backdrop-blur-sm hover:bg-white hover:text-slate-950">
                  <a href="#services">Our Services</a>
                </Button>
              </div>
              <div className="grid max-w-xl grid-cols-2 gap-[var(--phi-space-3)] border-t border-white/25 pt-[var(--phi-space-4)] text-white">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                   <span className="text-sm font-semibold">Timing confirmed after request</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                   <span className="text-sm font-semibold">Final price after inspection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
       <section id="services" data-cc-section="services" data-cc-label="Services" className="scroll-mt-[112px] phi-section bg-muted/30">
        <div className="phi-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-[var(--phi-space-4)] mb-[var(--phi-space-5)] reveal-on-scroll">
            <div>
               <h2 className="phi-section-title mb-4">Garage Door Service Catalog</h2>
               <p className="phi-copy text-muted-foreground text-lg leading-relaxed">
                 {(services?.length ?? 0) > 0
                   ? 'Published services with estimates that still require final confirmation.'
                   : 'Service offerings appear here only after the business verifies its public catalog.'}
               </p>
            </div>
             {(services?.length ?? 0) > 0 && <Button
              type="button"
              variant="ghost"
              className="font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10"
              aria-expanded={showAllServices}
              aria-controls="services-grid"
              onClick={() => setShowAllServices((expanded) => !expanded)}
            >
              {showAllServices ? 'Show featured services' : 'See full catalog'}
              <ArrowRight className={`h-4 w-4 transition-transform ${showAllServices ? 'rotate-90' : ''}`} />
             </Button>}
          </div>

           <div id="services-grid" className="grid grid-cols-1 md:grid-cols-3 gap-[var(--phi-space-4)]">
             {visibleServices.length === 0 ? (
               <div className="phi-card border bg-card p-[var(--phi-space-5)] text-center text-muted-foreground md:col-span-3">
                 The public service catalog, pricing, and typical durations are awaiting business verification.
               </div>
             ) : visibleServices.map((service, i) => (
               <div key={service.id} className="phi-card phi-card-interactive group bg-card border p-[var(--phi-space-4)] flex flex-col h-full reveal-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                  <Wrench className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
                 <p className="font-semibold text-foreground/80 mb-2">{service.benefit}</p>
                 <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                   <span className="font-bold text-sm">
                     {isVerified ? `Starting estimate $${service.startingPrice} · final after inspection` : 'Pricing awaiting verification'}
                   </span>
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
        <section id="work" data-cc-section="work" data-cc-label="Project Gallery" className="scroll-mt-[112px] phi-section border-y bg-background">
           <div className="phi-container">
             <div className="text-center phi-copy mx-auto mb-[var(--phi-space-6)] reveal-on-scroll">
               <p className="phi-eyebrow text-primary mb-3">Representative imagery</p>
               <h2 className="phi-section-title mx-auto">Examples of garage-door styles and settings</h2>
               <p className="mt-4 text-muted-foreground">These images demonstrate website presentation and are not claimed as completed customer projects.</p>
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
        <section id="before-after" data-cc-section="before-after" data-cc-label="Before & After" className="scroll-mt-[112px] phi-section bg-muted/20 border-b">
         <div className="phi-container">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-[var(--phi-space-4)] mb-[var(--phi-space-5)] reveal-on-scroll">
            <div className="max-w-2xl">
               <p className="phi-eyebrow text-primary mb-3">Illustrative comparisons</p>
               <h2 className="phi-section-title mb-4">Preview a before-and-after presentation</h2>
               <p className="text-muted-foreground text-lg leading-relaxed">These sample comparisons demonstrate the website layout and are not verified customer jobs.</p>
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

           <div id="full-before-after-grid" className="phi-grid-wide reveal-on-scroll">
             {visibleBeforeAfterTasks.map((task) => (
              <article key={task.id} className="phi-card overflow-hidden border bg-card shadow-sm">
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
                <div className="p-[var(--phi-space-4)]">
                  <h3 className="font-display text-xl font-bold">{task.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING */}
        <section className="scroll-mt-[112px] phi-section-tight bg-muted/20 border-b relative overflow-hidden" id="booking" data-cc-section="booking" data-cc-label="Booking">
         <div className="phi-container relative z-10">
          <div className="max-w-2xl mx-auto reveal-on-scroll">
            <BookingForm />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
       <section className="hidden phi-section bg-background border-b md:block" id="testimonials">
         <div className="phi-container">
           <div className="phi-copy mb-[var(--phi-space-5)] reveal-on-scroll">
              <p className="phi-eyebrow text-primary mb-3">Independent review source</p>
              <h2 className="phi-section-title mb-8">Google Business Profile reviews</h2>
          </div>
           <GoogleReviewsPresentation feed={googleFeed} isLoading={isLoadingReviews} isError={isErrorReviews} />
        </div>
      </section>

       <ServiceAreaSection serviceArea={settings?.serviceArea} isVerified={isVerified} />

       <section id="trust" data-cc-section="trust" data-cc-label="Trust & Credentials" className="scroll-mt-[112px] border-b bg-background py-[var(--phi-space-6)]">
         <div className="phi-container">
           <div className="grid gap-[var(--phi-space-5)] lg:grid-cols-[0.9fr_1.1fr]">
             <div>
               <p className="phi-eyebrow mb-3 text-primary">Trust & transparency</p>
               <h2 className="phi-section-title">Know what is verified before you request service</h2>
               <p className="mt-4 text-muted-foreground leading-7">
                 {isVerified
                   ? 'The business identity and contact profile have been marked verified. Specific credentials and policies appear only when supplied.'
                   : 'This is a non-indexed website preview. Business identity, contacts, coverage, credentials, hours, warranties, and payment terms have not been verified and are intentionally withheld.'}
               </p>
             </div>
             <div className="phi-card border bg-card p-[var(--phi-space-4)]">
               {trustItems.length > 0 ? (
                 <dl className="grid gap-4 sm:grid-cols-2">
                   {trustItems.map(([label, value]) => (
                     <div key={label}>
                       <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
                       <dd className="mt-1 font-semibold">{value}</dd>
                     </div>
                   ))}
                 </dl>
               ) : (
                 <p className="font-semibold">No credentials or commercial terms are published until the business supplies and verifies them.</p>
               )}
               <div className="mt-5 space-y-2 border-t pt-4 text-sm leading-6 text-muted-foreground">
                 <p><strong className="text-foreground">Privacy:</strong> Request details are used to respond to the customer. Maya messages are processed by an AI service and stay in this browser session unless the customer copies them into a request.</p>
                 <p><strong className="text-foreground">Terms:</strong> Submitting a form does not confirm service coverage, an appointment, arrival time, final price, warranty, or financing.</p>
                 <p><strong className="text-foreground">Accessibility:</strong> The site supports keyboard navigation and readable labels. Contact details appear only after verification.</p>
               </div>
             </div>
           </div>
         </div>
       </section>

      {/* FAQ */}
        <section className="scroll-mt-[112px] phi-section bg-muted/10" id="faq" data-cc-section="faqs" data-cc-label="FAQ">
         <div className="phi-container">
          <div className="max-w-4xl mx-auto reveal-on-scroll">
            <div className="flex items-end justify-between gap-5 mb-10">
              <div>
                 <p className="phi-eyebrow text-primary mb-3">Helpful Answers</p>
                 <h2 className="phi-section-title">Frequently Asked Questions</h2>
              </div>
              <button
                type="button"
                className="hidden sm:inline-flex text-sm font-bold text-primary hover:underline shrink-0"
                aria-expanded={showAllFaqs}
                aria-controls="faq-list"
                onClick={() => setShowAllFaqs((expanded) => !expanded)}
              >
                {showAllFaqs ? 'Show featured FAQs' : 'View all FAQs'}
              </button>
            </div>
            <div id="faq-list" className="space-y-3">
              {visibleFaqs.map((faq) => (
                <div 
                  key={faq.id} 
                  className={`border rounded-xl bg-card overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'shadow-md border-primary/30' : 'hover:border-border/80'}`}
                >
                  <button
                     type="button"
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold"
                     aria-expanded={activeFaq === faq.id}
                     aria-controls={`faq-answer-${faq.id}`}
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  >
                    {faq.question}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                   <div id={`faq-answer-${faq.id}`} hidden={activeFaq !== faq.id} className="px-6 pb-5">
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="sm:hidden mt-7 inline-flex text-sm font-bold text-primary hover:underline"
              aria-expanded={showAllFaqs}
              aria-controls="faq-list"
              onClick={() => setShowAllFaqs((expanded) => !expanded)}
            >
              {showAllFaqs ? 'Show featured FAQs' : 'View all FAQs'}
            </button>
          </div>
        </div>
      </section>
      
      {/* Mobile Quick Action Button */}
      <div 
         className={`lg:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 right-[4.75rem] z-40 transition-all duration-300 ${
          showQuickRequest ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
        }`}
      >
         <Button asChild size="lg" className="h-14 w-full px-5 font-display font-bold shadow-2xl glow-primary rounded-full">
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
}: {
  feed: GoogleReviewFeed | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-[var(--phi-space-5)]">
        <div className="phi-card h-32 w-full bg-muted/30 animate-pulse border border-border/50"></div>
        <div className="phi-grid-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="phi-card h-48 bg-muted/20 animate-pulse border border-border/50"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="phi-card text-center p-[var(--phi-space-5)] bg-muted/10 border border-border/50 text-muted-foreground">
        Unable to load reviews.
      </div>
    );
  }

  const isDisconnected = feed?.mode === 'live' && feed?.connectionStatus !== 'connected';
  const hasNoReviews = !feed || !feed.reviews || feed.reviews.length === 0;

  if (isDisconnected || hasNoReviews) {
    return (
      <div className="phi-card text-center p-[var(--phi-space-5)] bg-muted/10 border border-border/50 text-muted-foreground">
        No connected Google Business Profile review feed is available. The site does not substitute sample testimonials or preview ratings.
      </div>
    );
  }

  return (
    <div className="space-y-[var(--phi-space-6)] reveal-on-scroll">
      {/* Aggregate Header */}
      <div className="phi-card flex flex-col gap-[var(--phi-space-4)] md:flex-row md:items-center md:justify-between bg-card border p-[var(--phi-space-4)] sm:p-[var(--phi-space-5)] shadow-sm relative overflow-hidden">
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
              Based on {feed.totalReviewCount} Google reviews for <strong className="text-foreground">{feed.locationName}</strong>
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
      <div className="phi-grid-cards">
        {feed.reviews.map((review) => (
          <div key={review.id} className="phi-card bg-card border p-[var(--phi-space-4)] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover-elevate flex flex-col relative group transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]">
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