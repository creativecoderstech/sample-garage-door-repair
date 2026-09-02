import { Link } from "wouter";
import { useGetBusinessSettings } from "@workspace/api-client-react";
import { Shield, MapPin, Phone, Mail } from "lucide-react";
import { format } from "date-fns";

export function SiteFooter() {
  const { data: settings } = useGetBusinessSettings();
  
  return (
    <footer className="bg-foreground text-background py-12 lg:py-16 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-16">
          <div className="md:col-span-2">
            <h3 className="font-display font-bold text-2xl mb-4 text-background">
              {settings?.businessName || "Summit Garage Door Co."}
            </h3>
            <p className="text-background/70 mb-6 max-w-md leading-relaxed">
              Professional garage door repair, installation, and maintenance. We secure your home's largest moving object safely and efficiently.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/10 text-background/90 text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Fully Licensed & Insured
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4 text-background">Services</h4>
            <ul className="space-y-3 text-background/70">
              <li><Link href="/services" className="hover:text-background transition-colors">Spring Replacement</Link></li>
              <li><Link href="/services" className="hover:text-background transition-colors">Opener Repair</Link></li>
              <li><Link href="/services" className="hover:text-background transition-colors">Cable Replacement</Link></li>
              <li><Link href="/services" className="hover:text-background transition-colors">New Installations</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-4 text-background">Contact</h4>
            <ul className="space-y-3 text-background/70">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 shrink-0" />
                <span>{settings?.phone || "(555) 123-4567"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 shrink-0" />
                <span>{settings?.email || "service@summitgaragedoor.demo"}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                <span>{settings?.serviceArea || "Greater Metropolitan Area"}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-background/50 text-sm">
          <p>© {format(new Date(), 'yyyy')} {settings?.businessName || "Summit Garage Door Co."}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-background transition-colors">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}