import { useEffect } from "react";
import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings, useGetGoogleReviewFeed } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ShieldCheck, MapPin } from "lucide-react";
import { Metadata } from "@/components/seo-metadata";
import { BookingForm } from "@/components/booking-form";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";
import { ServiceIcon } from "@/components/service-icon";

export default function HomePage() {
  return (
    <ContentBoundary>
      <HomePageContent />
    </ContentBoundary>
  );
}

function HomePageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();
  const { data: reviews } = useGetGoogleReviewFeed();

  const homePage = content.find(c => c.kind === "page" && c.slug === "home" && c.status === "published");
  const services = content.filter(c => c.kind === "service" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);
  
  const isVerified = settings?.verificationStatus === "verified";
  
  // Location coverage must require BOTH location verification + business verification
  const locations = content.filter(c => c.kind === "location" && c.status === "published" && (!isVerified || c.verificationStatus === "verified")).sort((a, b) => a.sortOrder - b.sortOrder);
  
  // Project images always clearly representative unless record itself verified
  const projects = content.filter(c => c.kind === "project" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 4);
  const faqs = content.filter(c => c.kind === "faq" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);
  const trustClaims = content.filter(c => c.kind === "trust" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <Metadata 
        title={homePage?.seoTitle || settings?.businessName || "Cumming Garage Door Service"}
        description={homePage?.seoDescription || homePage?.summary}
        noindex={!isVerified}
      />
      
      {/* Hero Section */}
      <section className="relative phi-hero flex flex-col justify-center bg-black overflow-hidden">
        {settings?.heroImage ? (
          <div className="absolute inset-0 z-0">
            <img src={publicAssetUrl(settings.heroImage)} alt="Elegant contemporary home with a modern garage door" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-secondary noise-overlay" />
        )}
        
        <div className="phi-container relative z-10 py-20 flex-grow flex flex-col justify-center">
          <div className="max-w-4xl">
            {isVerified && settings?.trustProfile?.yearsInBusiness && (
              <span className="inline-block py-1 px-3 bg-primary text-primary-foreground font-bold tracking-widest text-xs uppercase mb-6 rounded-none">
                {settings.trustProfile.yearsInBusiness}
              </span>
            )}
            <h1 className="garage-display text-5xl md:text-7xl lg:text-[7rem] text-white uppercase mb-4 text-balance leading-[0.95]">
              Garage Door Repair & Installation <br />
              <span className="text-primary italic font-serif text-5xl md:text-7xl lg:text-[6rem] lowercase tracking-normal">Done Right.</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed font-medium">
              {homePage?.summary || "Garage-door repair, opener service and new door installation for homes and businesses."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="rounded-none h-14 px-8 font-bold uppercase tracking-widest text-sm bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="#booking">Request Service</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none h-14 px-8 font-bold uppercase tracking-widest text-sm text-white border-white/30 hover:bg-white/10 hover:text-white backdrop-blur">
                <Link href="#services">Explore Services</Link>
              </Button>
            </div>
            
          </div>
        </div>
      </section>

      {/* Selected offerings, not unverified business credentials. */}
      <div className="bg-background border-b border-border">
        <div className="phi-container">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50 py-8">
            <div className="flex flex-col items-center text-center px-4">
              <span className="garage-display text-4xl mb-1">Repair</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Doors, springs & hardware</span>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <span className="garage-display text-4xl mb-1">Openers</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Repair & installation</span>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <span className="garage-display text-4xl mb-1 text-primary">New Doors</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Find your home's style</span>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <span className="garage-display text-4xl mb-1">Commercial</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service for your business</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body Content from Page */}
      {homePage?.body && (
        <section className="phi-section bg-background">
          <div className="phi-container max-w-4xl">
            <h2 className="garage-display text-4xl md:text-5xl uppercase mb-8 text-center">About {settings?.businessName || "Cumming Garage Door Service"}</h2>
            <div className="prose prose-lg dark:prose-invert mx-auto text-foreground/90 prose-p:leading-relaxed prose-headings:font-display prose-headings:uppercase">
              {homePage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Claims */}
      {isVerified && trustClaims.length > 0 && (
        <section className="phi-section-tight bg-secondary text-secondary-foreground border-y border-border">
          <div className="phi-container">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {trustClaims.map(claim => (
                <div key={claim.id} className="flex flex-col items-center text-center gap-3 p-4">
                  <ShieldCheck className="w-10 h-10 text-primary opacity-90" />
                  <h3 className="font-display text-xl uppercase tracking-wider">{claim.title}</h3>
                  <p className="text-sm opacity-80">{claim.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services Overview */}
      <section id="services" className="phi-section bg-muted/30 relative border-b border-border">
        <div className="phi-container relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="garage-display text-4xl md:text-6xl uppercase tracking-wide text-foreground mb-2">Our Services</h2>
              <p className="font-serif italic text-xl text-muted-foreground">Repair, replacement and maintenance for your garage door.</p>
            </div>
            <Button asChild variant="link" className="font-bold uppercase tracking-widest text-primary p-0">
              <Link href="/services" className="flex items-center gap-2">
                View All Services <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.map(service => (
              <Link key={service.id} href={`/services/${service.slug}`} className="group block h-full">
                <div className="phi-card h-full bg-card hover:border-primary/50 transition-colors border border-border p-8 flex flex-col items-start gap-4 rounded-none">
                  <div className="w-12 h-12 rounded bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform shadow-sm">
                    <ServiceIcon serviceCode={service.serviceCode || service.slug} className="w-6 h-6" />
                  </div>
                  <h3 className="garage-display text-2xl uppercase tracking-wide mt-2 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-muted-foreground line-clamp-3 mb-4 flex-grow">{service.summary}</p>
                  <span className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2 mt-auto group-hover:text-primary transition-colors">
                    Learn More <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="booking" className="phi-section bg-background">
        <div className="phi-container max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-foreground mb-6">Ready to fix your garage door?</h2>
              <p className="font-serif italic text-xl text-muted-foreground mb-8">Tell us what your door needs. We'll confirm the next steps.</p>
              
              {isVerified && settings?.trustProfile?.hours && (
                <div className="p-6 bg-muted/30 border-l-4 border-primary rounded-r-lg mb-8">
                  <h4 className="font-bold uppercase tracking-wider mb-2 text-sm">Operating Hours</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{settings.trustProfile.hours}</p>
                </div>
              )}
            </div>
            
            <div>
              <BookingForm />
            </div>
          </div>
        </div>
      </section>

      {/* Work / Gallery Preview */}
      {projects.length > 0 && (
        <section id="work" className="phi-section bg-background border-b border-border">
          <div className="phi-container">
            <div className="text-center mb-16">
              <h2 className="garage-display text-4xl md:text-6xl uppercase tracking-wide text-foreground mb-2">Recent Work</h2>
              <p className="font-serif italic text-xl text-muted-foreground">See the quality of our craftsmanship.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {projects.map(project => (
                <div key={project.id} className="group relative overflow-hidden rounded-none aspect-[4/3] bg-muted border border-border">
                  {project.imageUrl ? (
                    <>
                      <img src={publicAssetUrl(project.imageUrl)} alt={project.imageAlt || project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {!isVerified && project.verificationStatus !== "verified" && (
                        <div className="absolute top-4 right-4 bg-background/90 text-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border border-border">
                          Style Inspiration
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-medium bg-muted">
                      No Image Provided
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white translate-y-4 group-hover:translate-y-0 transition-transform">
                    <h3 className="garage-display text-2xl uppercase tracking-wide mb-2">{project.title}</h3>
                    <p className="text-white/80 line-clamp-2 font-medium">{project.summary}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Button asChild size="lg" className="rounded-none font-bold uppercase tracking-widest">
                <Link href="/gallery">View Door Styles</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Before / After Preview */}
      <div id="before-after" className="scroll-mt-32"></div>

      {/* Service Area Preview */}
      {isVerified && locations.length > 0 && (
        <section id="service-area" className="phi-section bg-muted/30 border-b border-border">
          <div className="phi-container">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2">
                <div className="aspect-[4/3] bg-card relative flex items-center justify-center overflow-hidden border border-border shadow-sm">
                  <div className="absolute inset-0 bg-[url('/images/hero-desktop.webp')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
                  <MapPin className="w-20 h-20 text-primary relative z-10" />
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <h2 className="garage-display text-4xl md:text-5xl uppercase tracking-wide text-foreground mb-4">Service Area</h2>
                <p className="font-serif italic text-xl text-muted-foreground mb-8">We proudly serve homeowners across the region.</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-8">
                  {locations.map(loc => (
                    <Link key={loc.id} href={`/service-area/${loc.slug}`} className="flex items-center gap-3 text-foreground font-bold text-sm uppercase tracking-wide hover:text-primary transition-colors py-3 border-b border-border/50">
                      <MapPin className="w-4 h-4 text-primary" /> {loc.title}
                    </Link>
                  ))}
                </div>
                <Button asChild variant="outline" className="rounded-none font-bold uppercase tracking-widest">
                  <Link href="/service-area">View All Areas</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section id="faq" className="phi-section bg-background border-b border-border">
          <div className="phi-container max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="garage-display text-4xl md:text-5xl uppercase tracking-wide text-foreground mb-4">Common Questions</h2>
              <p className="font-serif italic text-xl text-muted-foreground">Everything you need to know about our services.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              {faqs.slice(0, 5).map(faq => (
                <div key={faq.id} className="bg-card border border-border p-6 rounded-none">
                  <h3 className="font-bold text-lg mb-3 flex items-start gap-3">
                    <span className="text-primary mt-1">Q.</span> {faq.title}
                  </h3>
                  <p className="text-muted-foreground pl-6">{faq.summary || faq.body}</p>
                </div>
              ))}
            </div>
            
            {faqs.length > 5 && (
              <div className="mt-10 text-center">
                <Button asChild variant="link" className="font-bold uppercase tracking-widest text-primary p-0">
                  <Link href="/faqs" className="flex items-center gap-2">
                    Read All FAQs <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
