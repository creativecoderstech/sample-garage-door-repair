import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
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

      <PageHeader 
        title={servicesPage?.title || "Services"} 
        subtitle={servicesPage?.summary || "Comprehensive garage door solutions"}
        breadcrumbs={[{ label: "Services" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-5xl">
          {servicesPage?.body && (
            <div className="prose prose-lg dark:prose-invert max-w-none mb-16 font-medium text-foreground/80 leading-relaxed text-center">
              {servicesPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map(service => (
              <div key={service.id} className="phi-card flex flex-col group overflow-hidden bg-card border border-border">
                {service.imageUrl && (
                  <div className="h-64 overflow-hidden bg-muted">
                    <img src={publicAssetUrl(service.imageUrl)} alt={service.imageAlt || service.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                )}
                <div className="p-8 flex flex-col flex-grow">
                  <div className="h-24 w-40 flex items-center justify-start text-foreground/75 mb-5 group-hover:text-primary group-hover:scale-105 transition-all">
                    <ServiceIcon serviceCode={service.serviceCode || service.slug} className="w-full h-full" />
                  </div>
                  <h2 className="garage-display text-3xl uppercase tracking-wide mb-4 group-hover:text-primary transition-colors">{service.title}</h2>
                  <p className="text-muted-foreground mb-8 flex-grow">{service.summary}</p>
                  
                  <Button asChild variant="outline" className="w-full rounded-none font-bold uppercase tracking-widest mt-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    <Link href={`/services/${service.slug}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-20 bg-secondary text-secondary-foreground border border-border p-10 md:p-16 text-center rounded-none relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="garage-display text-4xl md:text-5xl uppercase tracking-wide mb-4">Don't see what you need?</h3>
               <p className="text-lg text-secondary-foreground/80 mb-8 max-w-2xl mx-auto">Contact us to discuss your specific requirements. We handle almost any residential or commercial garage door issue.</p>
               <Button asChild size="lg" className="rounded-none font-bold uppercase tracking-widest px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                 <Link href="/contact#booking">Request Service</Link>
               </Button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
