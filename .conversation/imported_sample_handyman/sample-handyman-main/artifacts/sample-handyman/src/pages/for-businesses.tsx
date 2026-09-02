/**
 * /for-businesses — Dual-iframe marketing page.
 *
 * Hero: dark premium section showing the customer-facing site and the admin
 * console side by side, with an animated SVG arc connecting them.
 * Below: interactive "Try it yourself" section where both iframes are live.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Image,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  Monitor,
  Phone,
  Star,
  Zap,
} from 'lucide-react';

const logoFullImage = '/logo-full.svg';

// ─── Laptop chrome frame ──────────────────────────────────────────────────────

interface LaptopChromeProps {
  children: React.ReactNode;
  url?: string;
  /** Tailwind class for the glow color under the device */
  glowClass?: string;
  /** Height of the content area in px */
  contentHeight?: number;
  /** Additional class on the outer wrapper */
  className?: string;
}

function LaptopChrome({
  children,
  url = 'sample-handyman.samples.creativecoders.tech',
  glowClass = 'shadow-[0_24px_60px_-12px_rgba(22,163,74,0.35)]',
  contentHeight = 440,
  className = '',
}: LaptopChromeProps) {
  return (
    <div className={`w-full drop-shadow-2xl ${glowClass} ${className}`}>
      {/* Screen lid */}
      <div className="rounded-t-2xl overflow-hidden border border-white/10 bg-slate-800">
        {/* Browser bar */}
        <div className="bg-slate-700 border-b border-white/10 flex items-center gap-2 px-3 py-2">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 bg-slate-900/60 rounded-full px-3 py-0.5 text-[10px] text-slate-400 font-mono truncate border border-white/5">
            {url}
          </div>
        </div>
        {/* Content area */}
        <div className="overflow-hidden bg-background" style={{ height: contentHeight }}>
          {children}
        </div>
      </div>
      {/* Keyboard deck */}
      <div className="h-3 bg-slate-700 rounded-b-xl border-x border-b border-white/10 mx-2" />
      <div className="h-2 bg-slate-600 rounded-b-2xl border-x border-b border-white/10 mx-6" />
    </div>
  );
}

// ─── Light-bg laptop chrome (for the interactive section) ─────────────────────

function LaptopChromeLight({
  children,
  url = 'sample-handyman.samples.creativecoders.tech',
  contentHeight = 520,
}: {
  children: React.ReactNode;
  url?: string;
  contentHeight?: number;
}) {
  return (
    <div className="w-full drop-shadow-xl">
      <div className="rounded-t-2xl overflow-hidden border border-border bg-muted">
        <div className="bg-muted border-b border-border flex items-center gap-2 px-3 py-2">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-background/80 rounded-full px-3 py-0.5 text-[10px] text-muted-foreground font-mono truncate border border-border/50">
            {url}
          </div>
        </div>
        <div className="overflow-hidden bg-background" style={{ height: contentHeight }}>
          {children}
        </div>
      </div>
      <div className="h-3 bg-muted rounded-b-xl border-x border-b border-border mx-2" />
      <div className="h-2 bg-muted/70 rounded-b-2xl border-x border-b border-border mx-6" />
    </div>
  );
}

// ─── Animated SVG arc connector ───────────────────────────────────────────────

/**
 * Overlays an SVG on top of the dual-frame hero. The arc goes from
 * ~the right edge of the left frame (booking form area) to ~the left edge
 * of the right frame (inbox area). animateMotion moves a glowing dot along it.
 */
function FlowConnector() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <path
            id="fp-arc"
            d="M 50 72 C 50 88, 50 88, 50 28"
          />
          <filter id="fp-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dashed arc — subtle, decorative */}
        <use
          href="#fp-arc"
          fill="none"
          stroke="rgba(134,239,172,0.25)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Travelling dot */}
        <circle r="1.4" fill="#4ade80" filter="url(#fp-glow)">
          <animateMotion dur="3.2s" repeatCount="indefinite" calcMode="spline"
            keyTimes="0;0.1;0.9;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1">
            <mpath href="#fp-arc" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Inbox,           label: 'Manage service requests',  desc: 'Every lead in one inbox — no more lost voicemails.' },
  { icon: ImagePlus,       label: 'Upload photos & videos',   desc: 'Drag a job photo from your phone. It goes live instantly.' },
  { icon: LayoutDashboard, label: 'Control your branding',    desc: 'Colors, logo, hero image — change anything, no developer needed.' },
  { icon: Star,            label: 'See & manage reviews',     desc: 'Collect and showcase 5-star reviews from happy customers.' },
  { icon: Zap,             label: 'Capture leads 24/7',       desc: 'The booking form works while you sleep.' },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ForBusinessesPage() {
  const [mounted, setMounted] = useState(false);
  const [mobileTab, setMobileTab] = useState<'customer' | 'admin'>('customer');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Slide-in trigger
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Meta
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Get a Professional Website for Your Service Business';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = meta?.content ?? '';
    if (meta) meta.content = 'A professional website and powerful admin dashboard — built for handymen, plumbers, electricians, and other service businesses.';
    return () => {
      document.title = prevTitle;
      if (meta) meta.content = prevDesc;
    };
  }, []);

  // Reveal-on-scroll for lower sections
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.07, rootMargin: '0px 0px -20px 0px' }
    );
    document.querySelectorAll('.reveal-on-scroll,.reveal-fade,.reveal-scale')
      .forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const SCALE = 0.5;
  const INV = `${Math.round((1 / SCALE) * 100)}%`;

  return (
    <div className="min-h-screen bg-background">

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center min-w-0">
            <img src={logoFullImage} alt="Mike's Handyman Service" className="h-10 sm:h-12 w-auto" width={221} height={56} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              ← Back to site
            </Link>
            <Button asChild size="sm" className="font-display font-bold shadow-md">
              <a href="#contact">Get in touch</a>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════════════ DARK HERO ═══════════════ */}
      <section className="relative bg-slate-950 overflow-hidden pb-16 pt-14 lg:pb-20 lg:pt-16">
        {/* Ambient glow blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          {/* Text block */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <Building2 className="w-3.5 h-3.5" />
              For service business owners
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white mb-5">
              Two views.{' '}
              <span className="text-emerald-400">One product.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl mx-auto">
              On the left, what your customers see. On the right, what you control.
              This is the complete picture — live.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="font-display font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 w-full sm:w-auto">
                <a href="#try-it">Try it yourself →</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-display font-bold border-white/20 text-white bg-white/5 hover:bg-white/10 w-full sm:w-auto">
                <a href="#contact">Get in touch</a>
              </Button>
            </div>
            {/* Trust pills */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: Clock,        label: '5-day setup' },
                { icon: Monitor,      label: 'Mobile-first' },
                { icon: CheckCircle2, label: 'You own it forever' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs text-slate-400 border border-white/10 rounded-full px-3 py-1">
                  <Icon className="w-3 h-3 text-emerald-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Dual frames — desktop ── */}
          <div className="hidden lg:block">
            {/* Perspective labels */}
            <div className="flex gap-6 mb-3">
              <div className="flex-1 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  👤 Your customer's view
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 relative">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
                  📊 Your admin view
                </span>
                {/* Pulsing badge */}
                <span className="absolute -top-1 right-[calc(50%-90px)] flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500 text-white text-[9px] font-bold items-center justify-center">1</span>
                </span>
              </div>
            </div>

            {/* Frames + connector */}
            <div className="relative flex gap-6 items-start"
              style={{
                // Slide-in animations
                transition: 'none',
              }}
            >
              {/* Left: public site */}
              <div
                className="flex-1 transition-all duration-700 ease-out"
                style={{
                  transform: mounted ? 'translateX(0) opacity(1)' : 'translateX(-40px)',
                  opacity: mounted ? 1 : 0,
                  transitionDelay: '100ms',
                }}
              >
                <LaptopChrome
                  url="sample-handyman.samples.creativecoders.tech"
                  glowClass="shadow-[0_20px_50px_-10px_rgba(34,197,94,0.3)]"
                  contentHeight={440}
                >
                  <iframe
                    src="/"
                    title="Customer-facing website preview"
                    className="border-0 pointer-events-none"
                    style={{ width: INV, height: INV, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}
                    aria-hidden="true"
                    tabIndex={-1}
                    loading="lazy"
                  />
                </LaptopChrome>
              </div>

              {/* SVG arc connector — spans the gap between the two frames */}
              <div className="absolute inset-0 pointer-events-none z-10 hidden xl:block">
                <FlowConnector />
              </div>

              {/* Right: admin preview */}
              <div
                className="flex-1 transition-all duration-700 ease-out"
                style={{
                  transform: mounted ? 'translateX(0)' : 'translateX(40px)',
                  opacity: mounted ? 1 : 0,
                  transitionDelay: '250ms',
                }}
              >
                <LaptopChrome
                  url="admin · sample-handyman.samples.creativecoders.tech"
                  glowClass="shadow-[0_20px_50px_-10px_rgba(59,130,246,0.3)]"
                  contentHeight={440}
                >
                  <iframe
                    src="/admin?preview=true"
                    title="Admin dashboard preview"
                    className="border-0 pointer-events-none"
                    style={{ width: INV, height: INV, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}
                    aria-hidden="true"
                    tabIndex={-1}
                    loading="lazy"
                  />
                </LaptopChrome>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 mt-5">
              Both panels are live — not screenshots. Scroll down to interact with them.
            </p>
          </div>

          {/* ── Mobile: tab switcher ── */}
          <div className="lg:hidden">
            <div className="flex gap-2 mb-4 bg-white/5 rounded-xl p-1">
              {(['customer', 'admin'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMobileTab(t)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    mobileTab === t
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'customer' ? '👤 Customer view' : '📊 Admin view'}
                </button>
              ))}
            </div>
            <LaptopChrome
              url={mobileTab === 'customer'
                ? 'sample-handyman.samples.creativecoders.tech'
                : 'admin · sample-handyman.samples.creativecoders.tech'
              }
              glowClass={mobileTab === 'customer'
                ? 'shadow-[0_16px_40px_-8px_rgba(34,197,94,0.25)]'
                : 'shadow-[0_16px_40px_-8px_rgba(59,130,246,0.25)]'
              }
              contentHeight={360}
            >
              <iframe
                src={mobileTab === 'customer' ? '/' : '/admin?preview=true'}
                title={mobileTab === 'customer' ? 'Customer website' : 'Admin dashboard'}
                className="border-0 pointer-events-none"
                style={{ width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                aria-hidden="true"
                tabIndex={-1}
                loading="lazy"
              />
            </LaptopChrome>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRY IT YOURSELF ═══════════════ */}
      <section id="try-it" className="py-16 lg:py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-10 reveal-fade">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3">
              Try it yourself
            </h2>
            <p className="text-muted-foreground text-lg">
              Click around. Both panels are fully interactive — this is the real product.
            </p>
          </div>

          {/* Desktop: side-by-side interactive */}
          <div className="hidden lg:block reveal-scale">
            {/* Sticky labels */}
            <div className="flex gap-6 mb-3 sticky top-16 z-30">
              <div className="flex-1 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-background border border-border rounded-full px-3 py-1 shadow-sm text-foreground">
                  👤 Customer website
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-background border border-primary/30 rounded-full px-3 py-1 shadow-sm text-foreground">
                  📊 Your admin dashboard
                </span>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-1">
                <LaptopChromeLight url="sample-handyman.samples.creativecoders.tech" contentHeight={520}>
                  <iframe
                    src="/"
                    title="Interactive customer website"
                    className="border-0 w-full h-full"
                    loading="lazy"
                  />
                </LaptopChromeLight>
              </div>
              <div className="flex-1">
                <LaptopChromeLight
                  url="admin · sample-handyman.samples.creativecoders.tech"
                  contentHeight={520}
                >
                  <iframe
                    src="/admin?preview=true"
                    title="Interactive admin dashboard"
                    className="border-0 w-full h-full"
                    loading="lazy"
                  />
                </LaptopChromeLight>
              </div>
            </div>
          </div>

          {/* Mobile: stacked */}
          <div className="lg:hidden space-y-8 reveal-fade">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">👤 Customer website</p>
              <LaptopChromeLight url="sample-handyman.samples.creativecoders.tech" contentHeight={400}>
                <iframe
                  src="/"
                  title="Interactive customer website"
                  className="border-0 w-full h-full"
                  loading="lazy"
                />
              </LaptopChromeLight>
            </div>
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground shrink-0">and on the other side</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">📊 Your admin dashboard</p>
              <LaptopChromeLight
                url="admin · sample-handyman.samples.creativecoders.tech"
                contentHeight={420}
              >
                <iframe
                  src="/admin?preview=true"
                  title="Interactive admin dashboard"
                  className="border-0 w-full h-full"
                  loading="lazy"
                />
              </LaptopChromeLight>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURE STRIP ═══════════════ */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-xl mx-auto mb-10 reveal-fade">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3">
              One platform. Everything you need.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className="reveal-fade bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF ═══════════════ */}
      <section className="py-16 lg:py-24 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 max-w-3xl">
          <div className="reveal-scale bg-gradient-to-br from-primary/5 via-background to-background border border-primary/20 rounded-3xl p-8 sm:p-12 text-center">
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="text-xl sm:text-2xl font-display font-medium leading-relaxed text-foreground mb-8">
              "The admin dashboard changed how I run my business. I see every lead the moment it comes in, upload job photos right from my truck, and updated my whole site in ten minutes. It pays for itself every week."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-bold text-primary text-lg">
                M
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground">Mike R.</p>
                <p className="text-sm text-muted-foreground">Mike's Handyman Service · Austin, TX</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section id="contact" className="py-16 lg:py-24 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 text-center max-w-2xl">
          <div className="reveal-fade">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-4">
              Ready to get your own site?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              We'd love to learn about your business. Reach out and we'll talk through exactly what your site could look like.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="font-display font-bold shadow-lg glow-primary w-full sm:w-auto">
                <a href="mailto:hello@creativecoders.tech?subject=I%20want%20a%20website%20like%20this">
                  Email us to get started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              No pressure, no commitment — just a conversation.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ PAGE FOOTER ═══════════════ */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            ← Back to Mike's Handyman Service
          </Link>
          <p>© {new Date().getFullYear()} Creative Coders</p>
        </div>
      </footer>
    </div>
  );
}
