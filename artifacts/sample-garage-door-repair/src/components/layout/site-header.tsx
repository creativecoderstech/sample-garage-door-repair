import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, Warehouse, X } from "lucide-react";
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
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4 h-full" aria-label={`${settings?.businessName || "Cumming Garage Door Service"} home`}>
          <div className="bg-secondary text-secondary-foreground h-full flex flex-col justify-center px-4">
            <Warehouse className="h-8 w-8 mx-auto" aria-hidden="true" />
            <span className="text-[10px] uppercase font-bold tracking-widest mt-1 text-center leading-none">Doors</span>
          </div>
          <span className="garage-display text-xl sm:text-2xl leading-tight tracking-wide text-foreground mt-1 max-w-[190px] sm:max-w-none">
            {settings?.businessName || "Cumming Garage Door Service"}
          </span>
        </Link>

        <div className="flex items-center h-full">
          <nav aria-label="Main navigation" className="hidden h-full items-center lg:flex mr-6">
            {primary.map(page => {
              const href = contentRoute(page);
              return <Link key={page.id} href={href} aria-current={isActive(href) ? "page" : undefined}
                className={`px-4 text-sm font-semibold transition-colors hover:text-primary ${isActive(href) ? "text-primary" : "text-muted-foreground"}`}>
                {NAV_LABELS[page.slug] || page.title}
              </Link>;
            })}
            {more.length > 0 && <details data-site-menu className="group relative h-full flex items-center">
              <summary className="flex cursor-pointer list-none items-center gap-1 px-4 text-sm font-semibold text-muted-foreground hover:text-primary">More <ChevronDown className="h-3 w-3" /></summary>
              <div className="absolute right-0 top-full max-h-[65vh] w-64 overflow-y-auto rounded-b-md border-x border-b border-border bg-background p-2 shadow-xl">
                {more.map(page => <Link key={page.id} href={contentRoute(page)}
                  className={`block rounded px-3 py-2 text-sm font-semibold hover:bg-muted ${page.parentId ? "pl-6" : ""}`}>
                  {NAV_LABELS[page.slug] || page.title}
                </Link>)}
              </div>
            </details>}
          </nav>

          <Button asChild className="rounded-none h-full px-6 text-sm font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 hidden sm:flex">
            <Link href={bookingHref}>Request Service</Link>
          </Button>

          <button className="ml-4 shrink-0 rounded p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-border bg-background p-5 lg:hidden shadow-inner">
        {pages.map(page => <Link key={page.id} href={contentRoute(page)}
          className={`block border-b border-border py-4 font-semibold text-foreground ${page.parentId ? "pl-5 text-muted-foreground" : ""}`}>
          {NAV_LABELS[page.slug] || page.title}
        </Link>)}
        <Button asChild className="mt-6 w-full rounded-none h-12 font-bold uppercase tracking-widest"><Link href={bookingHref}>Request Service</Link></Button>
      </nav>}
    </header>
  );
}