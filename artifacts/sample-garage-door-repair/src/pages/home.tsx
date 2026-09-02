import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, Shield, Clock, ArrowRight, CheckCircle2, ChevronRight, Star } from "lucide-react";
import { useListGarageServices, useListTestimonials, useGetBusinessSettings } from "@workspace/api-client-react";
import { AssistantChat } from "@/components/assistant-chat";
import { AvailabilityChecker } from "@/components/availability-checker";

export default function HomePage() {
  const { data: services } = useListGarageServices();
  const { data: testimonials } = useListTestimonials();
  const { data: settings } = useGetBusinessSettings();

  const emergencyServices = services?.filter(s => s.emergency) || [];
  const standardServices = services?.filter(s => !s.emergency).slice(0, 3) || [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-secondary overflow-hidden">
        <img src={settings?.heroImage} alt="Professionally installed residential garage door" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/90 to-secondary/30"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-bold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Local & Trusted Experts
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-extrabold text-secondary-foreground leading-tight tracking-tight mb-6">
              Don't let a broken door hold your day hostage.
            </h1>
            <p className="text-xl text-secondary-foreground/80 font-medium mb-10 max-w-2xl leading-relaxed">
              Fast, professional garage door repair and installation. We secure your home's largest moving object so you can get back to life.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="h-14 px-8 text-lg font-bold rounded-full shadow-lg hover:scale-105 transition-transform">
                <Link href="/book">Book Service Now</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg font-bold rounded-full bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/20">
                <Link href="/services">View All Services</Link>
              </Button>
            </div>
            
            <div className="mt-12 flex items-center gap-6 text-sm font-semibold text-secondary-foreground/70">
               <div className="flex items-center gap-2">
                 <Shield className="h-5 w-5 text-primary" /> Fully Insured
               </div>
               <div className="flex items-center gap-2">
                 <Clock className="h-5 w-5 text-primary" /> Same-Day Service
               </div>
            </div>
          </div>
        </div>
      </section>

      {settings?.galleryImages?.length ? (
        <section className="py-20 bg-muted/20 border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Recent field work</p>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">Doors we’re proud to stand behind</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {settings.galleryImages.slice(0, 3).map((image, index) => (
                <div key={image} className="overflow-hidden rounded-2xl border bg-card aspect-[4/3] shadow-sm">
                  <img src={image} alt={`Garage door project ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Services Quick View */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">Our Core Services</h2>
              <p className="text-muted-foreground text-lg max-w-2xl">Expert solutions for every component of your garage door system.</p>
            </div>
            <Button variant="ghost" asChild className="font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10">
              <Link href="/services">See full catalog <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {standardServices.map(service => (
              <div key={service.id} className="group bg-card border rounded-2xl p-8 hover-elevate transition-all duration-300 flex flex-col h-full">
                <div className="bg-muted w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Wrench className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold font-display mb-3">{service.name}</h3>
                <p className="text-muted-foreground mb-6 flex-1">{service.description}</p>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                  <span className="font-bold text-lg">From ${service.startingPrice}</span>
                  <Button variant="ghost" size="sm" asChild className="rounded-full">
                    <Link href={`/book?service=${service.slug}`}>Book <ChevronRight className="h-4 w-4 ml-1"/></Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant & Availability Section */}
      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
                 Smart Diagnostic Tool
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-6 text-balance">
                Not sure what's wrong? Let's figure it out safely.
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Garage doors handle massive tension and weight. Before you try to fix it yourself, describe the problem to our AI assistant to get an immediate safety assessment and service recommendation.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Instant Safety Check</h4>
                    <p className="text-sm text-muted-foreground">Know immediately if you should stay clear of the door.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Accurate Quoting</h4>
                    <p className="text-sm text-muted-foreground">Better problem descriptions mean more accurate price estimates.</p>
                  </div>
                </div>
              </div>

              <div className="max-w-md">
                <AvailabilityChecker />
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-accent/10 blur-2xl rounded-full"></div>
              <div className="relative shadow-2xl rounded-xl border border-border/50 bg-background">
                <AssistantChat />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-16">Trusted by your neighbors</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials?.slice(0,3).map((testimonial) => (
              <div key={testimonial.id} className="bg-card border rounded-2xl p-8 text-left relative">
                <div className="absolute top-8 right-8 text-muted/30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                  </svg>
                </div>
                <div className="flex gap-1 mb-6 text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? 'fill-current' : 'text-muted stroke-current'}`} />
                  ))}
                </div>
                <p className="text-lg font-medium leading-relaxed mb-6">"{testimonial.quote}"</p>
                <div className="mt-auto">
                  <p className="font-bold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.city} • {testimonial.service}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-6">Ready to fix your door?</h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
            Book online in seconds. Our technicians are ready to secure your home.
          </p>
          <Button size="lg" variant="secondary" asChild className="h-14 px-10 text-lg font-bold rounded-full shadow-xl">
            <Link href="/book">Book Service Online</Link>
          </Button>
          <p className="mt-6 text-sm text-primary-foreground/70">
            Or call us directly at <span className="font-bold">{settings?.phone || "(555) 123-4567"}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
