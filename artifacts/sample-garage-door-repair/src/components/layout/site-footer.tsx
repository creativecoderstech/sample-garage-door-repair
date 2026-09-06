import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { MapPin, Phone, Mail, Clock, ShieldCheck } from "lucide-react";
import { contentRoute } from "@/lib/content-routes";

export function SiteFooter() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();
  
  const pages = content
    .filter(c => c.kind === "page" && c.status === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder);
    
  const services = content
    .filter(c => c.kind === "service" && c.status === "published")
    .slice(0, 5);
    
  const locations = content
    .filter(c => c.kind === "location" && c.status === "published")
    .slice(0, 5);

  const isVerified = settings?.verificationStatus === "verified";
  const trust = settings?.trustProfile;

  return (
    <footer className="bg-foreground text-background pt-16 md:pt-24 pb-8 relative overflow-hidden">
      <div className="absolute inset-0 noise-overlay opacity-10 pointer-events-none" />
      
      <div className="phi-container relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Brand Col */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="font-display text-3xl uppercase tracking-tighter text-primary">
              {settings?.businessName || "Garage Doors"}
            </Link>
            <p className="text-muted-foreground font-serif italic text-lg leading-relaxed max-w-sm">
              Crafting reliable, beautiful, and secure garage doors for our local community.
            </p>
            {isVerified && trust && (
              <div className="flex flex-col gap-3 mt-4">
                {trust.yearsInBusiness && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>{trust.yearsInBusiness}</span>
                  </div>
                )}
                {trust.licenseInsurance && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>{trust.licenseInsurance}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xl uppercase tracking-wider mb-2">Explore</h3>
            <ul className="flex flex-col gap-3">
              {pages.map(page => {
                const href = contentRoute(page);
                return (
                  <li key={page.id}>
                    <Link href={href} className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-wider">
                      {page.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Services & Areas */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xl uppercase tracking-wider mb-2">Services</h3>
            <ul className="flex flex-col gap-3 mb-6">
              {services.map(service => (
                <li key={service.id}>
                  <Link href={contentRoute(service)} className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-wider">
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
            
            {locations.length > 0 && (
              <>
                <h3 className="font-display text-xl uppercase tracking-wider mb-2">Service Area</h3>
                <ul className="flex flex-col gap-3">
                  {locations.map(loc => (
                    <li key={loc.id}>
                      <Link href={contentRoute(loc)} className="text-muted-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-wider">
                        {loc.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          
          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-xl uppercase tracking-wider mb-2">Contact</h3>
            
            <ul className="flex flex-col gap-4">
              {settings?.phone && (
                <li>
                  <a href={`tel:${settings.phone}`} className="flex items-start gap-3 text-muted-foreground hover:text-primary transition-colors group">
                    <Phone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold uppercase tracking-wider text-background">Phone</span>
                      <span>{settings.phone}</span>
                    </div>
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a href={`mailto:${settings.email}`} className="flex items-start gap-3 text-muted-foreground hover:text-primary transition-colors group">
                    <Mail className="w-5 h-5 text-primary group-hover:scale-110 transition-transform mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold uppercase tracking-wider text-background">Email</span>
                      <span>{settings.email}</span>
                    </div>
                  </a>
                </li>
              )}
              {settings?.serviceArea && (
                <li>
                  <div className="flex items-start gap-3 text-muted-foreground group">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold uppercase tracking-wider text-background">Serving</span>
                      <span>{settings.serviceArea}</span>
                    </div>
                  </div>
                </li>
              )}
              {isVerified && trust?.hours && (
                <li>
                  <div className="flex items-start gap-3 text-muted-foreground group">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold uppercase tracking-wider text-background">Hours</span>
                      <span className="whitespace-pre-wrap">{trust.hours}</span>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
          
        </div>
        
        <div className="border-t border-border/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium">
            &copy; {new Date().getFullYear()} {settings?.businessName || "Garage Door Repair"}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {content.some(page => page.kind === "page" && page.slug === "privacy-policy") && <Link href="/pages/privacy-policy" className="text-sm text-muted-foreground hover:text-primary">
              Privacy Policy
            </Link>}
            {content.some(page => page.kind === "page" && page.slug === "terms-of-service") && <Link href="/pages/terms-of-service" className="text-sm text-muted-foreground hover:text-primary">
              Terms of Service
            </Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
