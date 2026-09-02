import { useEffect, useMemo, useRef, useState } from 'react';
import { ReviewQuote } from '@/components/ReviewQuote';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { BookingForm } from '@/components/BookingForm';
import { ReviewForm } from '@/components/ReviewForm';
import { PhoneDisplay } from '@/components/PhoneDisplay';
import { ServiceAreaMap } from '@/components/ServiceAreaMap';
import {
  listGalleryItems,
  listTasks,
  useGetSiteSettings,
  useListGoogleReviews,
  useListReviews,
  type GalleryList,
  type TaskList,
} from '@workspace/api-client-react';
import { listFaqs, listServices } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { 
  Shield, 
  Clock, 
  Star, 
  CheckCircle2, 
  Zap, 
  Wrench, 
  Droplet, 
  Hammer,
  Home,
  Award,
  Phone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin,
  Loader2,
  ImagePlus,
  Menu,
} from 'lucide-react';
// Logo served as a static public asset (not bundled into JS — avoids 812 KB chunk)
const logoFullImage = '/logo-full.svg';

// Hero images at fixed public paths so index.html can <link rel="preload"> them
const HERO_WEBP = '/hero.webp';
const HERO_JPG = '/hero.jpg';

import tvMountingImage from '@assets/generated_images/tv-mounting.jpg';
import tvMountingImageWebp from '@assets/generated_images/tv-mounting.webp';
import plumbingImage from '@assets/generated_images/plumbing-repair.jpg';
import plumbingImageWebp from '@assets/generated_images/plumbing-repair.webp';
import furnitureImage from '@assets/generated_images/furniture-assembly.jpg';
import furnitureImageWebp from '@assets/generated_images/furniture-assembly.webp';
import toolsImage from '@assets/generated_images/tools-workbench.jpg';
import toolsImageWebp from '@assets/generated_images/tools-workbench.webp';
import handsWorkingImage from '@assets/generated_images/hands-working.jpg';
import handsWorkingImageWebp from '@assets/generated_images/hands-working.webp';

/** Used only if the gallery API is unavailable before defaults are seeded. */
const FALLBACK_GALLERY = [
  { id: 'fallback-1', imageUrl: tvMountingImage, alt: 'TV mounted above fireplace with clean cable management', label: 'TV Mounting' },
  { id: 'fallback-2', imageUrl: plumbingImage, alt: 'Professional under-sink plumbing repair', label: 'Plumbing Repair' },
  { id: 'fallback-3', imageUrl: furnitureImage, alt: 'Assembled modern bookshelf', label: 'Furniture Assembly' },
  { id: 'fallback-4', imageUrl: handsWorkingImage, alt: 'Professional handyman installing cabinet hardware', label: 'Cabinet Installation' },
  { id: 'fallback-5', imageUrl: HERO_JPG, alt: 'Light fixture installation', label: 'Electrical Work' },
  { id: 'fallback-6', imageUrl: toolsImage, alt: 'Professional tools', label: 'Ready for Any Job' },
];

/**
 * Map from known static JPEG asset URLs → their WebP counterparts.
 * API-served gallery images (from R2) are not in this map and fall back to JPEG.
 * Populated at module init so comparisons are O(1) at render time.
 */
const STATIC_WEBP_MAP = new Map<string, string>([
  [tvMountingImage, tvMountingImageWebp],
  [plumbingImage, plumbingImageWebp],
  [furnitureImage, furnitureImageWebp],
  [toolsImage, toolsImageWebp],
  [handsWorkingImage, handsWorkingImageWebp],
  [HERO_JPG, HERO_WEBP],
]);

/** Used only if the FAQ API is unavailable or empty. */
const FALLBACK_FAQS = [
  {
    q: "What's your service area?",
    a: "I serve Austin, Round Rock, Cedar Park, Georgetown, and surrounding Greater Austin Area communities. If you're within 20 miles of Austin, TX, I can help."
  },
  {
    q: "How quickly can you respond?",
    a: "I respond to requests in 41 minutes on average. Most messages get answered within an hour, even on weekends."
  },
  {
    q: "Do you offer free estimates?",
    a: "Yes! For larger projects I provide free, detailed estimates. Smaller jobs are typically quoted after a quick phone discussion."
  },
  {
    q: "What payment methods do you accept?",
    a: "I accept Apple Pay, cash, check, credit cards, PayPal, Square, Venmo, and Zelle. Payment is due upon completion."
  },
  {
    q: "Are you licensed and insured?",
    a: "Yes, I'm fully insured through Next Insurance and background-checked through both Thumbtack and TaskRabbit platforms."
  },
  {
    q: "What if I need to reschedule?",
    a: "Life happens — just let me know as soon as possible and we'll find a time that works better."
  },
];

/** Two rows on desktop: gallery 4×2, before/after 2×2. */
const HOME_GALLERY_PAGE = 8;
const HOME_TASKS_PAGE = 4;
const HOME_FAQS_PAGE = 48;
const HOME_SERVICES_PAGE = 20;
const GALLERY_HOME_KEY = ['/api/gallery', 'home', HOME_GALLERY_PAGE] as const;
const TASKS_HOME_KEY = ['/api/tasks', 'home', HOME_TASKS_PAGE] as const;
const FAQS_HOME_KEY = ['/api/faqs', 'home', HOME_FAQS_PAGE] as const;
const SERVICES_HOME_KEY = ['/api/services', 'home', HOME_SERVICES_PAGE] as const;

type ServiceCardIcon = typeof Zap | typeof Wrench | typeof Droplet | typeof Hammer | typeof Home | typeof Sparkles | typeof Star | typeof Shield;

const ICON_SLUG_MAP: Record<string, ServiceCardIcon> = {
  zap: Zap,
  wrench: Wrench,
  droplet: Droplet,
  hammer: Hammer,
  home: Home,
  sparkles: Sparkles,
  star: Star,
  shield: Shield,
};

const SERVICE_COLORS = [
  'from-chart-2 to-amber-400',
  'from-primary to-blue-600',
  'from-chart-3 to-cyan-500',
  'from-chart-4 to-purple-500',
  'from-chart-5 to-emerald-600',
  'from-chart-1 to-rose-500',
  'from-chart-2 to-orange-500',
];

const FALLBACK_SERVICES = [
  {
    icon: Zap,
    title: 'Electrical & Lighting',
    benefit: 'Fixtures replaced, fans hung, outlets fixed.',
    description: 'Stop squinting at dead bulbs or flickering switches. Light fixture installation, ceiling fans, outlet repairs, and switch replacements — done safely, done right.',
    color: 'from-chart-2 to-amber-400'
  },
  {
    icon: Wrench,
    title: 'TV Mounting & Shelving',
    benefit: 'Your TV on the wall, cables invisible.',
    description: 'Clean installs with no visible wiring. TV mounting, floating shelves, picture hanging, mirror installation, and full cable management.',
    color: 'from-primary to-blue-600'
  },
  {
    icon: Droplet,
    title: 'Plumbing Repairs',
    benefit: 'Stop the drip before it becomes a flood.',
    description: 'Leaky faucets, running toilets, slow drains — caught and fixed before a small annoyance becomes a costly problem.',
    color: 'from-chart-3 to-cyan-500'
  },
  {
    icon: Hammer,
    title: 'Furniture Assembly',
    benefit: 'IKEA boxes turned into finished rooms.',
    description: 'Skip the three-hour wrestling match with confusing instructions. Desks, shelves, beds, cabinets — assembled correctly the first time.',
    color: 'from-chart-4 to-purple-500'
  },
  {
    icon: Home,
    title: 'Home Repairs & Maintenance',
    benefit: 'The punch-list that actually gets done.',
    description: 'Drywall patches, sticking doors, trim work, and general repairs — the to-do items that pile up. One call and they disappear.',
    color: 'from-chart-5 to-emerald-600'
  }
];

function collapseInfinitePages<T>(data: InfiniteData<T> | undefined) {
  if (!data?.pages.length) return data;
  return {
    pages: [data.pages[0]],
    pageParams: [data.pageParams[0]],
  };
}

const NAV_LINKS = [
  { id: 'services', label: 'Services' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Our Work' },
  { id: 'testimonials', label: 'Reviews' },
  { id: 'faq', label: 'FAQ' },
] as const;

export default function HomePage() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [showQuickRequest, setShowQuickRequest] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reviewScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { data: submittedReviews } = useListReviews();
  const { data: googleReviews } = useListGoogleReviews();
  const galleryQuery = useInfiniteQuery({
    queryKey: GALLERY_HOME_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listGalleryItems({ limit: HOME_GALLERY_PAGE, offset: pageParam as number }),
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });
  const tasksQuery = useInfiniteQuery({
    queryKey: TASKS_HOME_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listTasks({ limit: HOME_TASKS_PAGE, offset: pageParam as number }),
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });
  const faqsQuery = useQuery({
    queryKey: FAQS_HOME_KEY,
    queryFn: () => listFaqs({ limit: HOME_FAQS_PAGE, offset: 0 }),
  });
  const servicesQuery = useQuery({
    queryKey: SERVICES_HOME_KEY,
    queryFn: () => listServices({ limit: HOME_SERVICES_PAGE, offset: 0 }),
  });
  const { data: siteSettings } = useGetSiteSettings();
  const phoneDisplay = siteSettings?.phone?.trim() || '(512) 244-8550';
  const heroSrc = siteSettings?.heroImageUrl?.trim() || HERO_JPG;
  const heroWebpSrc = heroSrc === HERO_JPG ? HERO_WEBP : null;
  const apiGallery = useMemo(
    () => galleryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [galleryQuery.data],
  );
  const tasks = useMemo(
    () => tasksQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [tasksQuery.data],
  );
  const galleryTotal = galleryQuery.data?.pages[0]?.total ?? 0;
  const tasksTotal = tasksQuery.data?.pages[0]?.total ?? 0;
  const galleryExpanded = (galleryQuery.data?.pages.length ?? 0) > 1;
  const tasksExpanded = (tasksQuery.data?.pages.length ?? 0) > 1;
  const gallery =
    !galleryQuery.isError && apiGallery.length > 0 ? apiGallery : FALLBACK_GALLERY;
  const apiFaqs = useMemo(
    () =>
      (faqsQuery.data?.items ?? []).map((item) => ({
        q: item.question,
        a: item.answer,
      })),
    [faqsQuery.data],
  );
  const faqs =
    !faqsQuery.isError && apiFaqs.length > 0 ? apiFaqs : FALLBACK_FAQS;

  const showLessGallery = () => {
    queryClient.setQueryData<InfiniteData<GalleryList>>(GALLERY_HOME_KEY, collapseInfinitePages);
    document.getElementById('work')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showLessTasks = () => {
    queryClient.setQueryData<InfiniteData<TaskList>>(TASKS_HOME_KEY, collapseInfinitePages);
    document
      .getElementById('transformations')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Re-bind whenever async content (gallery/tasks/reviews) arrives, otherwise cards
  // rendered after mount are never observed and stay hidden at opacity 0.
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            const id = entry.target.getAttribute('id');
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-fade, .reveal-scale');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [tasks, submittedReviews, apiGallery]);

  // Sync review carousel dot indicators to scroll position (mobile only).
  useEffect(() => {
    const el = reviewScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.scrollWidth / Math.max(el.children.length, 1);
      const idx = Math.round(el.scrollLeft / cardWidth);
      setActiveReviewIdx(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [submittedReviews]);

  // Hash-based scroll: if URL contains #booking, re-scroll after async content settles.
  // The browser's native anchor scroll fires before React loads data, so layout shifts
  // (gallery, tasks, FAQs loading in) push the section out of view — especially on mobile.
  // "#testimonials" intentionally lands on the review form card (the owner
  // shares that link with customers so they can leave a review).
  useEffect(() => {
    const targets: Record<string, string> = {
      '#booking': 'booking',
      '#testimonials': 'leave-review',
    };
    const scrollOnce = (smooth: boolean) => {
      const targetId = targets[window.location.hash];
      if (!targetId) return;
      const el = document.getElementById(targetId);
      if (!el) return;
      const headerH = document.querySelector('header')?.offsetHeight ?? 60;
      const top = el.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    };

    // Async content above the target (gallery, tasks, FAQs) keeps loading in
    // and shifting layout after the first scroll, so re-assert the position
    // a few times: first smooth, then instant corrections once settled.
    const scheduleScrolls = (delays: number[]) =>
      delays.map((d, i) => setTimeout(() => scrollOnce(i === 0), d));

    let timers = scheduleScrolls([500, 1500, 3000]);
    const redirectScroll = () => {
      timers.forEach(clearTimeout);
      // In-page click: layout is mostly settled; still re-assert once.
      timers = scheduleScrolls([0, 700]);
    };
    const onHashChange = redirectScroll;
    // hashchange does NOT fire when the clicked link's hash equals the
    // current one (e.g. loading /#testimonials then clicking "Reviews"),
    // so also catch in-page anchor clicks directly.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const hash = anchor?.getAttribute('href');
      if (hash && targets[hash]) redirectScroll();
    };
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onClick);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onClick);
    };
  }, []);

  // Mobile quick-action: after hero, hide while the request form is on screen.
  useEffect(() => {
    const booking = document.getElementById('booking');
    if (!booking) return;

    let bookingVisible = false;
    const sync = () => {
      setShowQuickRequest(window.scrollY > 420 && !bookingVisible);
      setShowScrollTop(window.scrollY > 600);
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

  const apiServices = useMemo(
    () =>
      (servicesQuery.data?.items ?? []).map((svc, i) => ({
        icon: ICON_SLUG_MAP[svc.iconSlug] ?? Wrench,
        title: svc.title,
        benefit: svc.benefit,
        description: svc.description,
        color: SERVICE_COLORS[i % SERVICE_COLORS.length],
      })),
    [servicesQuery.data],
  );
  const services =
    !servicesQuery.isError && apiServices.length > 0 ? apiServices : FALLBACK_SERVICES;

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      location: 'Austin, TX',
      rating: 5,
      text: "Mike mounted our 65\" TV and ran all the cables through the wall. Showed up exactly on time and the work is flawless. You'd never know the cables were there.",
      initial: 'S'
    },
    {
      name: 'Marcus Johnson',
      location: 'Round Rock, TX',
      rating: 5,
      text: "Had him fix a leaky faucet and install two ceiling fans. Done in under two hours, priced fairly, and he cleaned up after himself. This is the guy you call.",
      initial: 'M'
    },
    {
      name: 'Jennifer Park',
      location: 'Cedar Park, TX',
      rating: 5,
      text: "Assembled an entire office's worth of furniture — desks, filing cabinets, shelving. Professional, efficient, and honestly a relief to not deal with confusing instructions myself.",
      initial: 'J'
    }
  ];

  const stats = [
    { label: 'Tasks Completed', value: '660+', icon: CheckCircle2 },
    { label: 'Avg. Response Time', value: '41 min', icon: Clock },
    { label: 'Thumbtack Rating', value: `${siteSettings?.thumbtackRating ?? '4.9'}★`, icon: Star },
    { label: 'Years in Business', value: '4', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-background noise-overlay">
      {/* Skip to main content — visible on keyboard focus for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 bg-background/[0.97] backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center group min-w-0">
            <img
              src={logoFullImage}
              alt="Mike's Handyman Service"
              className="h-12 sm:h-14 lg:h-[5.25rem] w-auto lg:group-hover:scale-105 transition-transform"
              width={221}
              height={56}
              data-testid="img-logo-header"
            />
          </div>
          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`text-sm font-semibold transition-colors relative ${
                  activeSection === link.id
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {link.label}
                {activeSection === link.id && (
                  <span className="absolute -bottom-5 left-0 right-0 h-0.5 bg-primary" />
                )}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <PhoneDisplay
              phone={phoneDisplay}
              className="text-sm font-bold text-primary"
              icon={
                <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Phone className="w-2.5 h-2.5 text-primary-foreground" />
                </span>
              }
            />
            <Button
              asChild
              size="sm"
              className="font-display font-bold h-10 px-3 sm:px-5 shadow-md glow-primary"
              data-testid="button-header-request-service"
            >
              <a href="#booking">
                <span className="sm:hidden">Book</span>
                <span className="hidden sm:inline">Book a Service</span>
              </a>
            </Button>
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background/80 text-foreground hover:bg-muted transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          id="mobile-nav-drawer"
          side="right"
          className="flex flex-col pt-12 pb-8 px-6 w-72 sm:max-w-xs"
          aria-label="Navigation menu"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          {/* Logo / brand name */}
          <div className="mb-6 flex items-center gap-2">
            <img
              src={logoFullImage}
              alt="Mike's Handyman Service"
              className="h-10 w-auto"
              width={160}
              height={40}
            />
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1 flex-1">
            {NAV_LINKS.map((link) => (
              <SheetClose asChild key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-colors ${
                    activeSection === link.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {link.label}
                  {activeSection === link.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </a>
              </SheetClose>
            ))}
          </nav>

          {/* Phone number at the bottom */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Call or text</p>
            <PhoneDisplay
              phone={phoneDisplay}
              className="text-lg font-bold text-primary"
              icon={
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden" aria-labelledby="hero-heading">

        {/* ═══════════════════════════════════════════════════════
            MOBILE: full-bleed photo — Mike's face fills the
            first viewport; headline + CTAs overlay from bottom.
            ═══════════════════════════════════════════════════════ */}
        <div className="lg:hidden relative" style={{ minHeight: 'calc(100svh - 3.75rem)' }}>
          {/* Background photo */}
          <picture className="absolute inset-0 w-full h-full">
            {heroWebpSrc && <source srcSet={heroWebpSrc} type="image/webp" />}
            <img
              src={heroSrc}
              alt="Mike installing a light fixture — Mike's Handyman Service"
              className="w-full h-full object-cover object-top"
              width={1024}
              height={1024}
              fetchPriority="high"
            />
          </picture>

          {/* Gradient overlay — dark at bottom for text, clear at top so face shows */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Content anchored to bottom — thumb-zone placement */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 space-y-4">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3 h-3 shrink-0" aria-hidden="true" />
              Veteran Owned · Top Pro 2024 &amp; 2025
            </div>

            {/* Headline */}
            <h1 className="font-display font-bold text-4xl leading-[1.05] tracking-tight text-white">
              Your home,{' '}
              <span style={{ color: 'hsl(142 55% 62%)' }}>fixed right.</span>
            </h1>

            {/* Compact proof line */}
            <p className="text-white/75 text-sm leading-relaxed">
              Austin's most responsive handyman —{' '}
              <strong className="text-white">660+ jobs</strong>,{' '}
              <strong className="text-white">41-min</strong> avg. response,{' '}
              <strong className="text-white">{siteSettings?.thumbtackRating ?? '4.9'} ★</strong> on Thumbtack.
            </p>

            {/* CTAs */}
            <div className="flex gap-3 pt-1">
              <Button
                asChild
                size="lg"
                className="flex-1 font-display font-bold shadow-xl glow-primary"
                data-testid="button-hero-booking"
              >
                <a href="#booking">Book a Service</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="font-display font-bold border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                data-testid="button-hero-services"
              >
                <a href="#work">My Work</a>
              </Button>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-[-2rem] left-1/2 -translate-x-1/2 animate-bounce z-10" aria-hidden="true">
            <ChevronDown className="w-5 h-5 text-white/50" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            DESKTOP: classic two-column — text left, photo right.
            ═══════════════════════════════════════════════════════ */}
        <div className="hidden lg:block relative pt-16 pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left: copy */}
              <div className="reveal-on-scroll">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-wide uppercase">
                  <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Veteran Owned · Top Pro 2024 &amp; 2025 · Austin, TX
                </div>

                <h1 id="hero-heading" className="font-display font-bold text-6xl lg:text-7xl leading-[1.02] mb-5 tracking-tight">
                  Your home,{' '}
                  <br />
                  <span className="text-primary">fixed right.</span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Austin's most responsive handyman. Mike has completed{' '}
                  <strong className="text-foreground">660+ jobs</strong> across Greater Austin Area — responding in{' '}
                  <strong className="text-foreground">41 minutes</strong> on average and rated{' '}
                  <strong className="text-foreground">{siteSettings?.thumbtackRating ?? '4.9'} ★</strong> across {siteSettings?.thumbtackReviewCount ? `${siteSettings.thumbtackReviewCount}+` : '110+'} verified reviews.
                </p>

                <div className="flex gap-4 mb-8">
                  <Button
                    asChild
                    size="lg"
                    className="font-display font-bold text-base px-8 py-5 h-auto shadow-lg hover:shadow-xl magnetic-hover glow-primary"
                    data-testid="button-hero-booking"
                  >
                    <a href="#booking">Book a Service</a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="font-display font-bold text-base px-8 py-5 h-auto border-2 magnetic-hover"
                    data-testid="button-hero-services"
                  >
                    <a href="#work">See My Work</a>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span><strong className="text-foreground">41-min</strong> avg. response</span>
                  </span>
                  <span className="w-px h-4 bg-border" aria-hidden="true" />
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span><strong className="text-foreground">660+</strong> jobs completed</span>
                  </span>
                  <span className="w-px h-4 bg-border" aria-hidden="true" />
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-accent fill-accent shrink-0" aria-hidden="true" />
                    <span><strong className="text-foreground">{siteSettings?.thumbtackRating ?? '4.9'} / {siteSettings?.taskrabbitRating ?? '5.0'}</strong> on Thumbtack &amp; TaskRabbit</span>
                  </span>
                </div>
              </div>

              {/* Right: photo + stat strip */}
              <div className="reveal-scale" style={{ transitionDelay: '0.2s' }}>
                <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                  <picture>
                    {heroWebpSrc && <source srcSet={heroWebpSrc} type="image/webp" />}
                    <img
                      src={heroSrc}
                      alt="Mike installing a light fixture — Mike's Handyman Service"
                      className="w-full h-auto block"
                      width={1024}
                      height={1024}
                      fetchPriority="high"
                    />
                  </picture>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 flex flex-col items-center text-center shadow-sm">
                    <Zap className="w-4 h-4 text-primary mb-1" aria-hidden="true" />
                    <div className="font-display font-extrabold text-lg text-foreground leading-none">41 min</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Avg. Response</div>
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 flex flex-col items-center text-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mb-1" aria-hidden="true" />
                    <div className="font-display font-extrabold text-lg text-foreground leading-none">660+</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">Jobs Done</div>
                  </div>
                  <div className="bg-primary rounded-2xl px-4 py-3 flex flex-col items-center text-center shadow-sm">
                    <Award className="w-4 h-4 text-primary-foreground mb-1" aria-hidden="true" />
                    <div className="font-display font-extrabold text-lg text-primary-foreground leading-none">Top Pro</div>
                    <div className="text-[11px] text-primary-foreground/80 mt-0.5 font-medium">2024 &amp; 2025</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

      </section>

      {/* Stats Section - Enhanced */}
      <section className="py-12 gradient-bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12" id="main-content">
            {stats.map((stat, i) => (
              <div key={i} className="text-center reveal-fade" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg" aria-hidden="true">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="font-display font-extrabold text-5xl md:text-6xl mb-2 font-mono tracking-tight">{stat.value}</div>
                <div className="text-sm font-semibold opacity-90 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-14 md:py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-10 reveal-on-scroll max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-wide uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              What I fix for you
            </div>
            <h2 className="font-display font-bold text-4xl md:text-5xl mb-4 tracking-tight">
              One call handles it all.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              No coordinating multiple contractors. I cover electrical, plumbing, mounting, assembly, and general repairs — showing up ready to solve the problem.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <div
                key={i}
                className="reveal-on-scroll group bg-card border border-card-border rounded-2xl p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-8 blur-2xl transition-opacity duration-500 rounded-full`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform duration-300`} aria-hidden="true">
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg mb-1 group-hover:text-primary transition-colors">{service.title}</h3>
                <p className="text-sm font-semibold text-primary/80 mb-2">{service.benefit}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            ))}
            <div className="reveal-on-scroll bg-muted/40 border border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center group hover:border-primary/40 transition-all duration-300" style={{ transitionDelay: '0.4s' }}>
              <p className="text-muted-foreground mb-3 font-medium text-sm">Don't see your job here?</p>
              <a href="#booking" className="font-display font-bold text-primary hover:text-accent transition-colors group-hover:underline underline-offset-4">
                Book a Service →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-14 md:py-20 gradient-bg-subtle">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="reveal-scale">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <picture>
                  <source srcSet={toolsImageWebp} type="image/webp" />
                  <img 
                    src={toolsImage} 
                    alt="Professional handyman tools and workbench" 
                    className="w-full h-auto"
                    width={1024}
                    height={1024}
                    loading="lazy"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
              </div>
            </div>
            <div className="reveal-on-scroll" style={{ transitionDelay: '0.2s' }}>
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-wide uppercase">
                <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                About Mike
              </div>
              <h2 className="font-display font-bold text-4xl md:text-5xl mb-5 tracking-tight leading-tight">
                Reliable by default.<br />
                <span className="text-primary">Not by accident.</span>
              </h2>
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  I'm Mike — a veteran who carried military precision into home repair. 
                  Mike's Handyman Service is built on one promise: show up on time, bring the right tools, 
                  and don't leave until it's done right.
                </p>
                <p>
                  660 jobs completed. 41-minute average response. Top Pro on Thumbtack two years running. 
                  Those aren't marketing numbers — they're what happens when you answer every message, 
                  treat every home like your own, and never cut corners.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Background Checked</div>
                    <div className="text-xs text-muted-foreground">Thumbtack &amp; TaskRabbit</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Fully Insured</div>
                    <div className="text-xs text-muted-foreground">Next Insurance</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Award className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Top Pro 2024 &amp; 2025</div>
                    <div className="text-xs text-muted-foreground">Thumbtack</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-card-border shadow-sm">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Star className="w-4.5 h-4.5 text-primary fill-primary/20" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">4.9 ★ Rated</div>
                    <div className="text-xs text-muted-foreground">494+ verified reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work Gallery — fixed tile grid */}
      <section id="work" className="py-16 md:py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 reveal-on-scroll">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-accent mb-2 tracking-wide uppercase">Recent work</p>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">Gallery</h2>
            </div>
            <p className="text-muted-foreground md:text-right max-w-sm">
              Clean installs and solid repairs — work with my name on it.
            </p>
          </div>

          <div className="gallery-grid">
            {gallery.map((item, i) => (
              <figure
                key={item.id}
                className="gallery-tile reveal-scale group"
                style={{ transitionDelay: `${Math.min(i, 5) * 0.06}s` }}
              >
                <picture>
                  {STATIC_WEBP_MAP.has(item.imageUrl) && (
                    <source srcSet={STATIC_WEBP_MAP.get(item.imageUrl)} type="image/webp" />
                  )}
                  <img src={item.imageUrl} alt={item.alt} loading="lazy" width={1024} height={1024} />
                </picture>
                <figcaption>{item.label}</figcaption>
              </figure>
            ))}
          </div>

          {!galleryQuery.isError && (galleryQuery.hasNextPage || galleryExpanded) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 reveal-on-scroll">
              {galleryQuery.hasNextPage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => galleryQuery.fetchNextPage()}
                  disabled={galleryQuery.isFetchingNextPage}
                  className="font-display font-bold min-w-40"
                >
                  {galleryQuery.isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load more (${galleryTotal - apiGallery.length} left)`
                  )}
                </Button>
              )}
              {galleryExpanded && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={showLessGallery}
                  className="font-display font-bold min-w-40"
                >
                  Show less
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Before & After — fixed comparison cards */}
      <section id="transformations" className="py-16 md:py-20 gradient-bg-subtle">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 reveal-on-scroll">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-accent mb-2 tracking-wide uppercase">Transformations</p>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">Before & After</h2>
            </div>
            <p className="text-muted-foreground md:text-right max-w-sm">
              The difference between “good enough” and done right.
            </p>
          </div>

          {!tasksQuery.isError && tasks.length > 0 ? (
            <>
              <div className="ba-grid">
                {tasks.map((project, i) => (
                  <article
                    key={project.id}
                    className="ba-card reveal-on-scroll"
                    style={{ transitionDelay: `${Math.min(i, 4) * 0.08}s` }}
                    data-testid={`before-after-${i}`}
                  >
                    <div className="ba-compare">
                      <div className="ba-pane">
                        <span className="ba-tag ba-tag-before">Before</span>
                        <img
                          src={project.beforeUrl}
                          alt={`${project.title} before`}
                          loading="lazy"
                        />
                      </div>
                      <div className="ba-pane">
                        <span className="ba-tag ba-tag-after">After</span>
                        <img
                          src={project.afterUrl}
                          alt={`${project.title} after`}
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div className="ba-meta">
                      <h3 className="font-display font-bold text-lg leading-snug">{project.title}</h3>
                      {project.location && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          {project.location}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {(tasksQuery.hasNextPage || tasksExpanded) && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 reveal-on-scroll">
                  {tasksQuery.hasNextPage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => tasksQuery.fetchNextPage()}
                      disabled={tasksQuery.isFetchingNextPage}
                      className="font-display font-bold min-w-40"
                    >
                      {tasksQuery.isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load more (${tasksTotal - tasks.length} left)`
                      )}
                    </Button>
                  )}
                  {tasksExpanded && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={showLessTasks}
                      className="font-display font-bold min-w-40"
                    >
                      Show less
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="reveal-on-scroll flex flex-col items-center justify-center gap-3 py-16 px-8 rounded-3xl border-2 border-dashed border-border bg-card/50 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="font-semibold text-foreground">Before &amp; After photos coming soon</p>
              <p className="text-sm text-muted-foreground max-w-xs">Mike is adding project photos — check back shortly.</p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section - Enhanced */}
      <section id="faq" className="py-14 md:py-20">
        <div className="container mx-auto px-6 lg:px-12 max-w-4xl">
          <div className="text-center mb-10 reveal-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6">
              <CheckCircle2 className="w-4 h-4" />
              Common Questions
            </div>
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-4 tracking-tight">Common questions</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Everything you need to know before booking.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="reveal-on-scroll bg-card border-2 border-card-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                style={{ transitionDelay: `${i * 0.08}s` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-8 py-6 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
                  data-testid={`button-faq-${i}`}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="font-display font-bold text-lg pr-4">{faq.q}</span>
                  <ChevronDown 
                    className={`w-5 h-5 shrink-0 mt-1 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div 
                  id={`faq-answer-${i}`}
                  role="region"
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-8 pb-6 text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced */}
      <section id="testimonials" className="py-14 md:py-20 gradient-bg-subtle">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-10 reveal-on-scroll max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6">
              <Star className="w-4 h-4" aria-hidden="true" />
              Client Reviews
            </div>
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-4 tracking-tight">What Clients Say</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {siteSettings?.thumbtackRating ?? '4.9'} stars on Thumbtack. {siteSettings?.taskrabbitRating ?? '5.0'} on TaskRabbit. Here's why.
            </p>
          </div>
          {/* Swipe hint — mobile only */}
          <p className="mb-3 text-center text-xs text-muted-foreground font-medium lg:hidden select-none" aria-hidden="true">
            ← Swipe to read more reviews →
          </p>

          <div className="relative">
          <div
            ref={reviewScrollRef}
            data-testid="row-reviews-scroll"
            className="flex items-start gap-8 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 lg:-mx-12 lg:px-12 scroll-smooth"
          >
            {[
              ...(Array.isArray(googleReviews) ? googleReviews : []).map((r) => ({
                key: `google-${r.id}`,
                name: r.authorName,
                location: 'Google Review',
                rating: Math.min(5, Math.max(1, r.rating)),
                text: r.text,
                initial: r.authorName.charAt(0).toUpperCase(),
                photoUrl: r.authorPhotoUrl || null,
                fromGoogle: true,
                dynamic: true,
              })),
              ...(Array.isArray(submittedReviews) ? submittedReviews : []).map((r) => ({
                key: `review-${r.id}`,
                name: r.name,
                location: r.location || 'Verified Customer',
                rating: Math.min(5, Math.max(1, Math.round(r.rating))),
                text: r.text,
                initial: r.name.charAt(0).toUpperCase(),
                photoUrl: null as string | null,
                fromGoogle: false,
                dynamic: true,
              })),
              ...testimonials.map((t, i) => ({ ...t, key: `testimonial-${i}`, photoUrl: null as string | null, fromGoogle: false, dynamic: false }))
            ].map((testimonial, i) => {
              const isExpanded = expandedReviews.has(testimonial.key);
              return (
              <div
                key={testimonial.key}
                data-testid={`card-review-${i}`}
                className={`${testimonial.dynamic ? '' : 'reveal-scale'} w-[85vw] sm:w-[380px] ${isExpanded ? 'h-auto' : 'h-[21rem]'} flex flex-col flex-shrink-0 snap-start bg-card border-2 border-card-border rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 group`}
                style={{ transitionDelay: `${(i % 3) * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-accent fill-accent" />
                    ))}
                  </div>
                  {testimonial.fromGoogle && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20 tracking-wide">
                      <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Google
                    </span>
                  )}
                </div>
                <ReviewQuote
                  text={testimonial.text}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedReviews((prev) => {
                      const next = new Set(prev);
                      if (next.has(testimonial.key)) next.delete(testimonial.key);
                      else next.add(testimonial.key);
                      return next;
                    })
                  }
                />
                <div className="flex items-center gap-4 mt-auto">
                  {testimonial.photoUrl ? (
                    <img
                      src={testimonial.photoUrl}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-lg">
                      {testimonial.initial}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            );})}
          </div>
          {/* Right-edge fade — visual cue that more reviews exist on mobile */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-20 bg-gradient-to-l from-background to-transparent lg:hidden" aria-hidden="true" />
          </div>

          {/* Dot indicators — mobile only */}
          {(() => {
            const totalReviews =
              (Array.isArray(googleReviews) ? googleReviews.length : 0) +
              (Array.isArray(submittedReviews) ? submittedReviews.length : 0) +
              testimonials.length;
            if (totalReviews < 2) return null;
            return (
              <div
                className="flex justify-center gap-2 mt-4 lg:hidden"
                role="tablist"
                aria-label="Review carousel position"
              >
                {Array.from({ length: totalReviews }).map((_, idx) => (
                  <button
                    key={idx}
                    role="tab"
                    aria-selected={idx === activeReviewIdx}
                    aria-label={`Review ${idx + 1} of ${totalReviews}`}
                    onClick={() => {
                      const el = reviewScrollRef.current;
                      if (!el) return;
                      const cardWidth = el.scrollWidth / el.children.length;
                      el.scrollTo({ left: cardWidth * idx, behavior: 'smooth' });
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeReviewIdx
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                  />
                ))}
              </div>
            );
          })()}

          {/* Leave a Review */}
          {(() => {
            const placeId = siteSettings?.googlePlaceId?.trim();
            const googleWriteReviewUrl = placeId
              ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
              : siteSettings?.googleReviewUrl?.trim() || undefined;
            return (
              <div id="leave-review" className="mt-10 max-w-2xl mx-auto reveal-on-scroll scroll-mt-20">
                <div className="bg-card border-2 border-card-border rounded-3xl p-8 md:p-10 shadow-xl">
                  <div className="mb-8 text-center">
                    <h3 className="font-display font-bold text-3xl mb-3 tracking-tight">Worked with Mike?</h3>
                    <p className="text-muted-foreground text-lg">
                      Share your experience — it helps neighbors find honest, reliable help.
                    </p>
                  </div>
                  <ReviewForm googleWriteReviewUrl={googleWriteReviewUrl} />
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Service Area */}
      <section id="service-area" className="py-14 md:py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-10 reveal-on-scroll max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Service Area
            </div>
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-4 tracking-tight">Where I Work</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Based in Austin, TX — serving homes within about 20 miles across the Greater Austin Area.
            </p>
          </div>
          <div className="grid lg:grid-cols-5 gap-8 items-stretch">
            <div className="lg:col-span-3 reveal-on-scroll rounded-3xl overflow-hidden border-2 border-card-border shadow-2xl min-h-[24rem]">
              <ServiceAreaMap />
            </div>
            <div className="lg:col-span-2 reveal-on-scroll bg-card border-2 border-card-border rounded-3xl p-8 shadow-lg flex flex-col justify-center" style={{ transitionDelay: '0.1s' }}>
              <h3 className="font-display font-bold text-2xl mb-6 tracking-tight">Communities Served</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 mb-8">
                {['Austin', 'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville', 'Kyle', 'Buda', 'Leander', 'Manor', 'Hutto'].map((town) => (
                  <li key={town} className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                    <span>{town}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Not sure if you're in range? If you're within about 20 miles of Austin, TX 78701, the answer is almost certainly yes — just ask.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Section - Enhanced */}
      <section id="booking" className="py-14 md:py-20 gradient-bg-subtle" style={{ scrollMarginTop: '4rem' }}>
        <div className="container mx-auto px-6 lg:px-12 max-w-3xl">
          <div className="text-center mb-8 reveal-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6">
              <Wrench className="w-4 h-4" aria-hidden="true" />
              Book a Service
            </div>
            <h2 className="font-display font-bold text-3xl md:text-5xl mb-4 tracking-tight">
              Tell us what you need
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Fill out the short form below. Mike reviews every request and confirms your time — usually within about 41 minutes.
            </p>
          </div>
          <div className="reveal-scale bg-card border-2 border-card-border rounded-3xl p-5 sm:p-8 md:p-14 shadow-2xl ring-1 ring-black/5" style={{ transitionDelay: '0.1s' }}>
            <BookingForm />
          </div>
        </div>
      </section>

      {/* Mobile quick link — always findable while scrolling */}
      {showQuickRequest && (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none">
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
            <Button
              asChild
              size="lg"
              className="pointer-events-auto w-full font-display font-bold shadow-2xl glow-primary"
              data-testid="button-mobile-request-service"
            >
              <a href="#booking">Book a Service</a>
            </Button>
          </div>
        </div>
      )}

      {/* Scroll-to-top — appears after scrolling past hero */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-[5.5rem] md:bottom-8 left-4 md:left-8 z-40 w-11 h-11 rounded-full bg-card border-2 border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer - Enhanced */}
      <footer className="py-16 border-t-2 border-border bg-gradient-to-br from-muted/30 to-background">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white rounded-2xl px-8 py-5 shadow-lg inline-block">
                <img
                  src={logoFullImage}
                  alt="Mike's Handyman Service logo"
                  className="w-[13.8rem]"
                  width={221}
                  height={56}
                  loading="lazy"
                  data-testid="img-logo-footer"
                />
              </div>
            </div>
            <p className="text-muted-foreground mb-2 font-medium">
              Professional handyman services • Greater Austin Area
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Austin, TX • Round Rock • Cedar Park • Georgetown
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 mb-8">
              {[
                { href: '#services',     label: 'Services' },
                { href: '#about',        label: 'About' },
                { href: '#testimonials', label: 'Reviews' },
                { href: '#booking',      label: 'Book a Service' },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5 rounded-full hover:bg-muted/60"
                >
                  {label}
                </a>
              ))}
              {siteSettings?.googleReviewUrl && (
                <a
                  href={siteSettings.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-[#4285F4]/10 text-[#4285F4] hover:bg-[#4285F4]/20 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-[#4285F4]" />
                  Google Review
                </a>
              )}
            </nav>
            <div className="pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                © {new Date().getFullYear()} Mike's Handyman Service. Veteran owned & operated.
              </p>
              <a
                href="/for-businesses"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Are you a service business?{' '}
                <span className="underline underline-offset-2">Get a site like this →</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
