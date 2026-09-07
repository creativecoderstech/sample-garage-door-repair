import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { Metadata } from "@/components/seo-metadata";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";
import { ServiceIcon } from "@/components/service-icon";

export default function ServicesPage() {
  return (
    <ContentBoundary>
      <ServicesPageContent />
    </ContentBoundary>
  );
}

function ServicesPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const servicesPage = content.find(c => c.kind === "page" && c.slug === "services" && c.status === "published");
  const services = content.filter(c => c.kind === "service" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);
  const isVerified = settings?.verificationStatus === "verified";

  return (
    <>
      <Metadata 
        title={servicesPage?.seoTitle || "Our Services"}
        description={servicesPage?.seoDescription || servicesPage?.summary}
        noindex={!isVerified}
      />

      <div className="relative bg-muted/20 border-b border-border overflow-hidden">
        <div className="noise-overlay" />

        <div className="phi-container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--phi-space-5)] items-center py-[var(--phi-space-5)] md:py-[var(--phi-space-6)]">
            <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-center">
              <nav aria-label="Breadcrumb" className="mb-[var(--phi-space-4)] flex flex-wrap items-center gap-[var(--phi-space-1)] text-xs font-medium text-muted-foreground uppercase tracking-wide font-sans">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <span className="flex min-w-0 items-center gap-[var(--phi-space-1)]">
                  <span>/</span>
                  <span className="text-foreground">Services</span>
                </span>
              </nav>

              <h1 className="garage-display text-4xl md:text-5xl lg:text-5xl uppercase text-foreground mb-[var(--phi-space-3)] leading-[1.05]">
                {servicesPage?.title || "Services"}
              </h1>

              <p className="font-serif italic text-lg md:text-xl text-muted-foreground max-w-xl">
                {servicesPage?.summary || "Comprehensive garage door solutions"}
              </p>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-7">
              <div className="relative w-full overflow-hidden rounded-[var(--phi-radius)] border border-border shadow-md" style={{ aspectRatio: '16/9' }}>
                <img
                  src={publicAssetUrl("/images/curated/service-commercial-cumming.jpg")}
                  alt="Commercial building with two overhead garage doors in North Georgia"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="phi-section bg-background">
        <div className="phi-container max-w-5xl">
          {servicesPage?.body && (
            <div className="prose prose-lg dark:prose-invert max-w-none mb-[var(--phi-space-6)] font-medium text-foreground/80 leading-relaxed text-center">
              {servicesPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--phi-space-4)]">
            {services.map(service => (
              <div key={service.id} className="phi-card flex flex-col group overflow-hidden bg-card border border-border">
                {service.imageUrl && (
                  <div className="h-64 overflow-hidden bg-muted">
                    <img src={publicAssetUrl(service.imageUrl)} alt={service.imageAlt || service.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                )}
                <div className="p-[var(--phi-space-4)] flex flex-col flex-grow">
                  <div className="h-28 w-52 flex items-center justify-start opacity-85 mb-[var(--phi-space-3)] group-hover:opacity-100 group-hover:scale-105 transition-all">
                    <ServiceIcon serviceCode={service.serviceCode || service.slug} className="w-full h-full" />
                  </div>
                  <h2 className="garage-display text-3xl uppercase tracking-wide mb-[var(--phi-space-3)] group-hover:text-primary transition-colors">{service.title}</h2>
                  <p className="text-muted-foreground mb-[var(--phi-space-4)] flex-grow">{service.summary}</p>
                  
                  <Button asChild variant="outline" className="w-full rounded-none font-bold uppercase tracking-widest mt-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    <Link href={`/services/${service.slug}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-[var(--phi-space-6)] bg-secondary text-secondary-foreground border border-border p-[var(--phi-space-5)] md:p-[var(--phi-space-6)] text-center rounded-none relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="garage-display text-4xl md:text-5xl uppercase tracking-wide mb-[var(--phi-space-3)]">Don't see what you need?</h3>
               <p className="text-lg text-secondary-foreground/80 mb-[var(--phi-space-4)] max-w-2xl mx-auto">Contact us to discuss your specific requirements. We handle almost any residential or commercial garage door issue.</p>
               <Button asChild size="lg" className="rounded-none font-bold uppercase tracking-widest px-[var(--phi-space-4)] bg-primary text-primary-foreground hover:bg-primary/90">
                 <Link href="/contact#booking">Request Service</Link>
               </Button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
