import { useEffect, useRef, useState } from 'react';
import { useListGarageServices, useListTestimonials, useGetBusinessSettings } from '@workspace/api-client-react';
import { useListFaqs, useListTasks } from '@/lib/demo-store';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { BookingForm } from '@/components/booking-form';
import { 
  Shield, 
  Clock, 
  Star, 
  CheckCircle2, 
  Wrench, 
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Phone
} from 'lucide-react';

export default function HomePage() {
  const { data: settings } = useGetBusinessSettings();
  const { data: services } = useListGarageServices();
  const { data: testimonials } = useListTestimonials();
  const { data: faqs } = useListFaqs();
  const { data: tasks } = useListTasks();
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showQuickRequest, setShowQuickRequest] = useState(false);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll, .reveal-fade, .reveal-scale');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [services, testimonials, faqs, tasks]);

  useEffect(() => {
    const booking = document.getElementById('booking');
    if (!booking) return;

    let bookingVisible = false;
    const sync = () => {
      setShowQuickRequest(window.scrollY > 420 && !bookingVisible);
    };

    const bookingObserver = new IntersectionObserver(
      ([entry]) => {
        bookingVisible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    bookingObserver.observe(booking);
    window.addEventListener('scroll', sync, { passive: true });
    sync();

    return () => {
      bookingObserver.disconnect();
      window.removeEventListener('scroll', sync);
    };
  }, []);

  const heroImage = settings?.heroImage || "/images/garage/hero-modern-garage.jpg";
  const galleryImages = settings?.galleryImages || [];
  const topServices = services?.slice(0, 3) || [];
  
  return (
    <div className="min-h-screen bg-background noise-overlay" id="main-content">
      {/* HERO SECTION */}
      <section id="hero" className="relative overflow-hidden">
        {/* Mobile View */}
        <div className="lg:hidden relative" style={{ minHeight: 'calc(100svh - 3.75rem)' }}>
          <div className="absolute inset-0 w-full h-full">
            <img src={heroImage} alt="Garage Door Service" className="w-full h-full object-cover object-top" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          
          <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-12 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm text-white text-xs font-bold tracking-wide uppercase">
              <Shield className="w-3 h-3 shrink-0" />
              Fully Licensed & Insured
            </div>
            <h1 className="font-display font-bold text-4xl leading-[1.1] tracking-tight text-white">
              Don't let a broken door <span className="text-primary">hold your day hostage.</span>
            </h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Fast, professional garage door repair and installation. We secure your home's largest moving object so you can get back to life.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild size="lg" className="flex-1 font-display font-bold shadow-xl glow-primary">
                <a href="#booking">Book Now</a>
              </Button>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce z-10">
            <ChevronDown className="w-5 h-5 text-white/50" />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block relative pt-16 pb-24 border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="reveal-on-scroll">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold tracking-wide uppercase">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  Local & Trusted Experts
                </div>
                <h1 className="font-display font-bold text-6xl xl:text-7xl leading-[1.02] mb-6 tracking-tight">
                  Don't let a broken door <br /><span className="text-primary">hold your day hostage.</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-lg">
                  Fast, professional garage door repair and installation. We secure your home's largest moving object so you can get back to life.
                </p>
                <div className="flex gap-4 mb-10">
                  <Button asChild size="lg" className="font-display font-bold h-14 px-8 text-lg shadow-xl glow-primary hover-elevate">
                    <a href="#booking">Book Service Now</a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="font-display font-bold h-14 px-8 text-lg hover-elevate">
                    <Link href="/services">Our Services</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Same-Day Service</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Fully Insured</span>
                  </div>
                </div>
              </div>
              <div className="relative reveal-scale">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative z-10 border-4 border-background">
                  <img src={heroImage} alt="Professional Garage Door Repair" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-accent/20 blur-3xl -z-10 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 reveal-on-scroll">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">Our Core Services</h2>
              <p className="text-muted-foreground text-lg max-w-2xl">Expert solutions for every component of your garage door system.</p>
            </div>
            <Button variant="ghost" asChild className="font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10">
              <Link href="/services">See full catalog <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topServices.map((service, i) => (
              <div key={service.id} className="group bg-card border rounded-2xl p-8 hover-elevate transition-all duration-300 flex flex-col h-full reveal-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-colors">
                  <Wrench className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold font-display mb-3">{service.name}</h3>
                <p className="text-muted-foreground mb-6 flex-1 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                  <span className="font-bold text-lg">From ${service.startingPrice}</span>
                  <Button variant="ghost" size="sm" asChild className="rounded-full">
                    <a href="#booking">Book <ChevronRight className="h-4 w-4 ml-1"/></a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY TEASER */}
      {galleryImages.length > 0 && (
        <section id="work" className="py-24 border-y bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll">
              <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Recent Field Work</p>
              <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Doors we’re proud to stand behind</h2>
            </div>
            <div className="gallery-grid reveal-on-scroll">
              {galleryImages.slice(0, 4).map((img, i) => (
                <figure key={i} className="gallery-tile">
                  <img src={img} alt={`Garage door project ${i + 1}`} loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="mt-12 text-center reveal-on-scroll">
              <Button asChild variant="outline" size="lg" className="font-display font-bold hover-elevate">
                <Link href="/gallery">View Full Gallery</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* BOOKING */}
      <section className="py-24 bg-muted/20 border-b relative overflow-hidden" id="booking">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="max-w-2xl mx-auto reveal-on-scroll">
            <BookingForm />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-background border-b" id="testimonials">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="max-w-2xl mb-12 reveal-on-scroll">
            <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Customer Stories</p>
            <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight">What our neighbors say</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-on-scroll">
            {testimonials?.slice(0, 4).map((review) => (
              <div key={review.id} className="bg-card border rounded-2xl p-7 shadow-sm hover-elevate flex flex-col">
                <div className="flex gap-1 mb-5 text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-muted stroke-current'}`} />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-7">"{review.quote}"</p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.city} • {review.service}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-muted/10" id="faq">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="max-w-4xl mx-auto reveal-on-scroll">
            <div className="flex items-end justify-between gap-5 mb-10">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary mb-3">Helpful Answers</p>
                <h2 className="font-display font-bold text-4xl md:text-5xl tracking-tight">Frequently Asked Questions</h2>
              </div>
              <Link href="/faqs" className="hidden sm:inline-flex text-sm font-bold text-primary hover:underline shrink-0">View all FAQs</Link>
            </div>
            <div className="space-y-3">
              {faqs?.map((faq) => (
                <div 
                  key={faq.id} 
                  className={`border rounded-xl bg-card overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'shadow-md border-primary/30' : 'hover:border-border/80'}`}
                >
                  <button
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold"
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  >
                    {faq.question}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  <div className={`px-6 overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'max-h-96 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/faqs" className="sm:hidden mt-7 inline-flex text-sm font-bold text-primary hover:underline">View all FAQs</Link>
          </div>
        </div>
      </section>
      
      {/* Mobile Quick Action Button */}
      <div 
        className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showQuickRequest ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
        }`}
      >
        <Button asChild size="lg" className="h-14 px-8 font-display font-bold shadow-2xl glow-primary rounded-full min-w-[200px]">
          <a href="#booking">Book Now</a>
        </Button>
      </div>
    </div>
  );
}