import { Link } from "wouter";
import { useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { Shield, MapPin, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { getPublicSectionHref } from "@/lib/public-navigation";

export function SiteFooter() {
  const { data: settings } = useGetPublicBusinessSettings();
  const isVerified = settings?.verificationStatus === "verified";
  
  return (
    <footer className="phi-site-footer bg-foreground text-background mt-auto">
      <div className="phi-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--phi-space-5)] lg:gap-[var(--phi-space-6)]">
          <div className="md:col-span-2">
            <h3 className="font-display font-bold text-2xl mb-4 text-background">
              {settings?.businessName || "Garage Door Service Preview"}
            </h3>
            <p className="text-background/70 mb-6 max-w-md leading-relaxed">
              This preview demonstrates a garage-door service website. Business identity, coverage, credentials, and policies must be verified before publication.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 text-background/90 text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {isVerified ? "Business profile verified" : "Business details awaiting verification"}
            </div>
          </div>
          
          <div className="min-w-0">
            <h4 className="font-bold text-lg mb-4 text-background">Services</h4>
            <ul className="space-y-3 text-background/70">
              <li><a href={getPublicSectionHref("services")} className="hover:text-background transition-colors">Spring Replacement</a></li>
              <li><a href={getPublicSectionHref("services")} className="hover:text-background transition-colors">Opener Repair</a></li>
              <li><a href={getPublicSectionHref("services")} className="hover:text-background transition-colors">Cable Replacement</a></li>
              <li><a href={getPublicSectionHref("services")} className="hover:text-background transition-colors">New Installations</a></li>
            </ul>
          </div>
          
          <div className="min-w-0">
            <h4 className="font-bold text-lg mb-4 text-background">Contact</h4>
            <ul className="space-y-3 text-background/70">
              {settings?.phone && <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 shrink-0" />
                <span>{settings.phone}</span>
              </li>}
              {settings?.email && <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 shrink-0" />
                <a
                  href={`mailto:${settings.email}`}
                  className="min-w-0 break-all hover:text-background transition-colors"
                >
                  {settings.email}
                </a>
              </li>}
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                <span>{settings?.serviceArea || "Greater Metropolitan Area"}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-[var(--phi-space-6)] pt-[var(--phi-space-4)] border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-[var(--phi-space-3)] text-background/50 text-sm">
          <p>© {format(new Date(), 'yyyy')} {settings?.businessName || "Garage Door Service Preview"}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#trust" className="hover:text-background transition-colors">Privacy & terms</a>
            <a href="#trust" className="hover:text-background transition-colors">Accessibility</a>
            <Link href="/login" className="hover:text-background transition-colors">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}