import { Link, useLocation } from "wouter";
import { useGetBusinessSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Phone, Menu, Shield, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { id: 'services', label: 'Services', href: '/services' },
  { id: 'work', label: 'Our Work', href: '/gallery' },
  { id: 'before-after', label: 'Before & After', href: '/before-after' },
] as const;

export function SiteHeader() {
  const { data: settings } = useGetBusinessSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();

  const phoneDisplay = settings?.phone?.trim() || '(555) 123-4567';

  // Hash-based scroll to matching sections if on home page
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // If it's just a hash link and we are on home, let normal behavior happen or scroll
    if (href.startsWith('/#') && location === '/') {
      e.preventDefault();
      const id = href.replace('/#', '');
      const el = document.getElementById(id);
      if (el) {
        const headerH = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - headerH;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/[0.97] backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center group min-w-0">
            <Link href="/" className="flex items-center gap-2 lg:group-hover:scale-105 transition-transform">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="font-display font-bold text-lg sm:text-xl truncate tracking-tight">
                {settings?.businessName || "Summit Garage Door Co."}
              </span>
            </Link>
          </div>
          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={`text-sm font-semibold transition-colors relative ${
                  location === link.href
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
                onClick={(e) => handleNavClick(e, link.href)}
              >
                {link.label}
                {location === link.href && (
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
              className="font-display font-bold h-10 px-3 sm:px-5 shadow-md glow-primary"
            >
              <Link href="/book">
                <span className="sm:hidden">Book</span>
                <span className="hidden sm:inline">Book a Service</span>
              </Link>
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
              <Link href="/" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-colors ${location === '/' ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-muted hover:text-foreground'}`}>
                Home
              </Link>
            </SheetClose>
            {NAV_LINKS.map((link) => (
              <SheetClose asChild key={link.id}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-semibold transition-colors ${
                    location === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.label}
                  {location === link.href && (
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
