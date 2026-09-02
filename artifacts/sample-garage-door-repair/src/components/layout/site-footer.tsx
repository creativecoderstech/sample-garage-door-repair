import { Link } from "wouter";
import { Shield, Wrench, Clock, Lock } from "lucide-react";
import { useGetBusinessSettings } from "@workspace/api-client-react";

export function SiteFooter() {
  const { data: settings } = useGetBusinessSettings();

  return (
    <footer className="bg-secondary text-secondary-foreground border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          
          <div className="md:col-span-1 space-y-4">
             <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
               <Wrench className="h-6 w-6 text-primary" />
               <span>{settings?.businessName || "Sample Garage Door Repair"}</span>
             </div>
             <p className="text-secondary-foreground/70 text-sm max-w-xs leading-relaxed">
               Trusted garage door repair and installation services. We secure your home's largest moving object with precision and care.
             </p>
             <div className="flex gap-4 pt-2">
                <div className="bg-background/10 p-2 rounded-full text-primary">
                    <Shield className="h-5 w-5" />
                </div>
                <div className="bg-background/10 p-2 rounded-full text-primary">
                    <Clock className="h-5 w-5" />
                </div>
             </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 font-display">Services</h3>
            <ul className="space-y-3 text-sm text-secondary-foreground/80">
              <li><Link href="/services" className="hover:text-primary transition-colors">Emergency Repair</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Spring Replacement</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Opener Installation</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Maintenance Tune-up</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">New Doors</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 font-display">Company</h3>
            <ul className="space-y-3 text-sm text-secondary-foreground/80">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/book" className="hover:text-primary transition-colors">Book Online</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors flex items-center gap-1"><Lock className="h-3 w-3"/> Staff Login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4 font-display">Contact</h3>
            <ul className="space-y-3 text-sm text-secondary-foreground/80">
              <li className="font-medium text-lg text-primary">{settings?.phone || "(555) 123-4567"}</li>
              <li>{settings?.email || "service@samplegaragerepair.com"}</li>
              <li className="pt-2">
                <span className="block font-semibold">Service Area:</span>
                {settings?.serviceArea || "Greater Metropolitan Area"}
              </li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-border/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-secondary-foreground/50">
          <p>© {new Date().getFullYear()} {settings?.businessName || "Sample Garage Door Repair"}. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-secondary-foreground cursor-pointer">Privacy Policy</span>
            <span className="hover:text-secondary-foreground cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
