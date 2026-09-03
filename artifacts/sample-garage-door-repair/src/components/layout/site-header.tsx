import { Link, useLocation } from "wouter";
import { useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Phone, Menu, Shield, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import {
  getPublicSectionId,
  getPublicSectionRouterHref,
  navigateToPublicSection,
  type PublicSection,
} from "@/lib/public-navigation";

const NAV_LINKS = [
  { id: 'services', label: 'Services', section: 'services' },
  { id: 'gallery', label: 'Gallery', section: 'gallery' },
  { id: 'before-after', label: 'Before & After', section: 'beforeAfter' },
  { id: 'faqs', label: 'FAQs', section: 'faqs' },
] as const;

export function SiteHeader() {
  const { data: settings } = useGetPublicBusinessSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );

  const phoneDisplay = settings?.phone?.trim() || '(555) 123-4567';

  useEffect(() => {
    if (location !== '/') {
      setActiveSection('');
      return;
    }

    let animationFrame = 0;
    const syncActiveSection = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const marker = window.scrollY + 140 + window.innerHeight * 0.45;
        let current = '';

        for (const link of NAV_LINKS) {
          const section = document.getElementById(getPublicSectionId(link.section));
          if (section && section.offsetTop <= marker) {
            current = getPublicSectionId(link.section);
          }
        }

        setActiveSection(current);
      });
    };

    syncActiveSection();
    window.addEventListener('scroll', syncActiveSection, { passive: true });
    window.addEventListener('resize', syncActiveSection);
    window.addEventListener('hashchange', syncActiveSection);
    window.addEventListener('popstate', syncActiveSection);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', syncActiveSection);
      window.removeEventListener('resize', syncActiveSection);
      window.removeEventListener('hashchange', syncActiveSection);
      window.removeEventListener('popstate', syncActiveSection);
    };
  }, [location]);

  const isLinkActive = (section: PublicSection) => {
    return location === '/' && activeSection === getPublicSectionId(section);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, section: PublicSection) => {
    e.preventDefault();
    const id = getPublicSectionId(section);
    setActiveSection(id);
    navigateToPublicSection(section);
  };

  return (
    <>
      <header className="phi-site-header sticky top-0 z-50 bg-background/[0.97] backdrop-blur-xl border-b border-border shadow-sm">
        <div className="phi-container flex items-center justify-between gap-3 py-3 sm:py-4">
          <div className="flex items-center group min-w-0">
            <Link href="/" className="flex items-center gap-2 lg:group-hover:scale-105 transition-transform">
              <div className="bg-primary text-primary-foreground p-2 rounded-[var(--phi-radius)]">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="font-display font-bold text-lg sm:text-xl truncate tracking-tight">
                {settings?.businessName || "Summit Garage Door Co."}
              </span>
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-[var(--phi-space-4)]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={getPublicSectionRouterHref(link.section)}
                className={`text-sm font-semibold transition-colors relative ${
                  isLinkActive(link.section)
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
                onClick={(e) => handleNavClick(e, link.section)}
              >
                {link.label}
                {isLinkActive(link.section) && (
                  <span className="absolute -bottom-5 left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-primary mr-2">
               <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                 <Phone className="w-3.5 h-3.5" />
               </span>
               {phoneDisplay}
            </div>
            <Button
              asChild
              size="sm"
               className="phi-control font-display font-bold px-3 sm:px-5 shadow-md glow-primary"
            >
              <Link
                href={getPublicSectionRouterHref("booking")}
                onClick={(e) => handleNavClick(e, "booking")}
              >
                <span className="sm:hidden">Book</span>
                <span className="hidden sm:inline">Book a Service</span>
              </Link>
            </Button>
            {/* Hamburger — mobile only */}
            <button
              className="phi-control lg:hidden flex items-center justify-center w-[var(--phi-control)] rounded-[var(--phi-radius)] border border-border bg-background/80 text-foreground hover:bg-muted transition-colors"
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
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          {/* Logo / brand name */}
          <div className="mb-6 flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg truncate tracking-tight">
              {settings?.businessName || "Summit Garage Door Co."}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-1 flex-1">
            <SheetClose asChild>
              <Link
                href="/"
                onClick={() => setActiveSection('')}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-colors ${location === '/' && !activeSection ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-muted hover:text-foreground'}`}
              >
                Home
              </Link>
            </SheetClose>
            {NAV_LINKS.map((link) => (
              <SheetClose asChild key={link.id}>
                <Link
                  href={getPublicSectionRouterHref(link.section)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-colors ${
                    isLinkActive(link.section)
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={(e) => handleNavClick(e, link.section)}
                >
                  {link.label}
                  {isLinkActive(link.section) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </Link>
              </SheetClose>
            ))}
          </nav>

          {/* Phone number at the bottom */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Call or text</p>
            <div className="flex items-center gap-2 text-lg font-bold text-primary">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              {phoneDisplay}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {settings?.emergencyEnabled && (
        <div className="bg-destructive text-destructive-foreground py-1.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          24/7 Emergency Service Available
        </div>
      )}
    </>
  );
}
