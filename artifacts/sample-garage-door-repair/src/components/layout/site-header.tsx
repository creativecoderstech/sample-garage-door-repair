import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, ChevronDown, Home as GarageDoor, Menu, Phone, X } from "lucide-react";
import { useGetPublicBusinessSettings, useListGarageContent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { contentRoute } from "@/lib/content-routes";

const NAV_LABELS: Record<string, string> = {
  home: "Home", services: "Services", "service-area": "Service Area",
  about: "About", blog: "Blog", contact: "Contact", gallery: "Gallery", faqs: "FAQs",
};
const PRIMARY_SLUGS = new Set(["services", "service-area", "about", "blog", "contact"]);

export function SiteHeader() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();
  const pages = content.filter(item => item.kind === "page" && item.status === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = pages.filter(page => !page.parentId && PRIMARY_SLUGS.has(page.slug));
  const more = pages.filter(page => page.slug !== "home" && !primary.some(item => item.id === page.id));
  const verifiedPhone = settings?.verificationStatus === "verified" ? settings.phone : "";
  const bookingHref = pages.some(page => page.slug === "contact") ? "/contact#booking" : "/#booking";

  useEffect(() => {
    setMobileOpen(false);
    document.querySelectorAll<HTMLDetailsElement>("[data-site-menu]").forEach(menu => { menu.open = false; });
  }, [location]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);

  const isActive = (href: string) => location === href || (href !== "/" && location.startsWith(`${href}/`));
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-5 px-5 md:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label={`${settings?.businessName || "Garage Door Service"} home`}>
          <GarageDoor className="h-9 w-9 shrink-0 text-primary" aria-hidden="true" />
          <span className="max-w-[190px] font-sans text-base font-extrabold leading-tight text-foreground">
            {settings?.businessName || "Garage Door Service"}
          </span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {primary.map(page => {
            const href = contentRoute(page);
            return <Link key={page.id} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={`whitespace-nowrap text-sm font-bold transition-colors hover:text-primary ${isActive(href) ? "text-primary" : "text-foreground"}`}>
              {NAV_LABELS[page.slug] || page.title}
            </Link>;
          })}
          {more.length > 0 && <details data-site-menu className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-bold hover:text-primary">More <ChevronDown className="h-3 w-3" /></summary>
            <div className="absolute right-0 top-9 max-h-[65vh] w-64 overflow-y-auto rounded-md border border-border bg-background p-2 shadow-xl">
              {more.map(page => <Link key={page.id} href={contentRoute(page)}
                className={`block rounded px-3 py-2 text-sm font-semibold hover:bg-muted ${page.parentId ? "pl-6" : ""}`}>
                {NAV_LABELS[page.slug] || page.title}
              </Link>)}
            </div>
          </details>}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {verifiedPhone && <a href={`tel:${verifiedPhone}`} aria-label={`Call ${verifiedPhone}`} className="rounded p-2 text-primary hover:bg-muted"><Phone className="h-5 w-5" /></a>}
          <Button asChild className="rounded-sm px-5 text-xs font-bold uppercase tracking-wide">
            <Link href={bookingHref}>Request Service <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <button className="shrink-0 rounded p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
      {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-border bg-background p-5 lg:hidden">
        {pages.map(page => <Link key={page.id} href={contentRoute(page)}
          className={`block border-b border-border/60 py-3 font-semibold ${page.parentId ? "pl-5" : ""}`}>
          {NAV_LABELS[page.slug] || page.title}
        </Link>)}
        <Button asChild className="mt-5 w-full"><Link href={bookingHref}>Request Service</Link></Button>
      </nav>}
    </header>
  );
}