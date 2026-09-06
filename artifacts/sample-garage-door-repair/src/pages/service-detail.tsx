import { Link, useRoute, Redirect } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";
import NotFound from "./not-found";
import { BookingForm } from "@/components/booking-form";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function ServiceDetailPage() {
  return (
    <ContentBoundary>
      <ServiceDetailPageContent />
    </ContentBoundary>
  );
}

function ServiceDetailPageContent() {
  const [, params] = useRoute("/services/:slug");
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const service = content.find(c => c.kind === "service" && c.slug === params?.slug && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";

  if (!service) {
    const aliased = content.find(c => c.kind === "service" && c.aliases?.includes(params?.slug || ""));
    if (aliased) {
      return <Redirect to={`/services/${aliased.slug}`} />;
    }
    return <NotFound />;
  }

  const relatedProjects = content.filter(c => c.kind === "project" && c.parentId === service.id && c.status === "published").slice(0, 3);
  const servicesList = content.filter(c => c.kind === "service" && c.status === "published");

  return (
    <>
      <Metadata 
        title={service.seoTitle || `${service.title} | Services`}
        description={service.seoDescription || service.summary}
        noindex={!isVerified}
        ogImage={service.imageUrl || undefined}
      />

      <PageHeader 
        title={service.title} 
        subtitle={service.summary}
        breadcrumbs={[
          { label: "Services", href: "/services" },
          { label: service.title }
        ]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            
            {/* Main Content */}
            <div className="w-full lg:w-2/3">
              {service.imageUrl && (
                <div className="w-full aspect-video rounded-xl overflow-hidden mb-10 bg-muted">
                  <img src={publicAssetUrl(service.imageUrl)} alt={service.imageAlt || service.title} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed">
                {service.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              
              {/* Related Projects */}
              {relatedProjects.length > 0 && (
                <div className="mt-16 pt-12 border-t border-border">
                  <h3 className="font-display text-3xl uppercase tracking-tighter mb-8">Related Work</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedProjects.map(project => (
                      <div key={project.id} className="group relative overflow-hidden rounded-lg aspect-square bg-muted">
                        {project.imageUrl && (
                          <>
                            <img src={publicAssetUrl(project.imageUrl)} alt={project.imageAlt || project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            {!isVerified && project.verificationStatus !== "verified" && (
                              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded z-10">
                                Representative
                              </div>
                            )}
                          </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6 text-white">
                          <span className="font-display text-lg uppercase tracking-wider">{project.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="w-full lg:w-1/3">
              <div className="sticky top-28 flex flex-col gap-8">
                
                {/* Booking Widget */}
                <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
                  <h3 className="font-display text-2xl uppercase tracking-tight mb-2">Request an Assessment</h3>
                  <p className="text-sm text-muted-foreground mb-6">Let us evaluate your {service.title.toLowerCase()} today.</p>
                  
                  <BookingForm />
                </div>
                
                {/* Other Services */}
                <div className="bg-muted/30 border border-border rounded-xl p-6">
                  <h3 className="font-display text-xl uppercase tracking-wide mb-6">Other Services</h3>
                  <ul className="flex flex-col gap-3">
                    {servicesList.filter(s => s.id !== service.id).map(s => (
                      <li key={s.id}>
                        <Link href={`/services/${s.slug}`} className="group flex items-center justify-between text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors py-2 border-b border-border/50">
                          {s.title}
                          <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
