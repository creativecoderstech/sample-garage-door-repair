import { Link, useLocation } from "wouter";
import { Wrench, Phone, ShieldAlert, FileText, Menu, X, ArrowRight, Settings, LayoutDashboard } from "lucide-react";
import { Button } from "../ui/button";
import { useGetBusinessSettings } from "@workspace/api-client-react";
import { useState } from "react";

export function SiteHeader() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: settings } = useGetBusinessSettings();

  const isAdmin = location.startsWith("/admin");
  const isDemo = location === "/login";

  if (isDemo) return null;

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
             <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Wrench className="h-5 w-5" />
             </div>
             <span>Ops Center</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/admin" ? "text-foreground" : "text-muted-foreground"}`}>
              Dashboard
            </Link>
            <Link href="/admin/settings" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/admin/settings" ? "text-foreground" : "text-muted-foreground"}`}>
              Settings
            </Link>
             <div className="h-4 w-px bg-border mx-2 hidden sm:block"></div>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/">View Site</Link>
            </Button>
          </nav>
        </div>
      </header>
    )
  }

  return (
    <>
      {settings?.emergencyEnabled && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>24/7 Emergency Service Active. Crews available now.</span>
        </div>
      )}
      
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
             <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm">
                <Wrench className="h-6 w-6" />
             </div>
             <div className="flex flex-col">
               <span className="font-display font-bold text-xl leading-none tracking-tight">
                 {settings?.businessName || "Sample Garage Door Repair"}
               </span>
               <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">
                 Professional Service
               </span>
             </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={`text-sm font-bold transition-colors hover:text-primary ${location === "/" ? "text-foreground" : "text-muted-foreground"}`}>
              Home
            </Link>
            <Link href="/services" className={`text-sm font-bold transition-colors hover:text-primary ${location === "/services" ? "text-foreground" : "text-muted-foreground"}`}>
              Services
            </Link>
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                 <Phone className="h-5 w-5" />
                 <span>{settings?.phone || "(555) 123-4567"}</span>
              </div>
              <Button asChild size="lg" className="rounded-full shadow-md font-bold">
                <Link href="/book">
                  Book Service <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </nav>

          {/* Mobile Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4 shadow-lg absolute w-full left-0 top-full">
            <Link 
              href="/" 
              className={`text-lg font-bold p-2 rounded-md ${location === "/" ? "bg-accent/10 text-accent" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/services" 
              className={`text-lg font-bold p-2 rounded-md ${location === "/services" ? "bg-accent/10 text-accent" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Services
            </Link>
            <div className="pt-4 border-t flex flex-col gap-4">
               <div className="flex items-center gap-2 text-primary font-bold justify-center text-xl">
                 <Phone className="h-6 w-6" />
                 <span>{settings?.phone || "(555) 123-4567"}</span>
              </div>
              <Button asChild size="lg" className="w-full text-lg h-14 rounded-full font-bold">
                <Link href="/book" onClick={() => setIsMobileMenuOpen(false)}>
                  Book Service Now
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
