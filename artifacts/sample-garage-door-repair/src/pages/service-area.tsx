import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function ServiceAreaPage() {
  return (
    <ContentBoundary>
      <ServiceAreaPageContent />
    </ContentBoundary>
  );
}

function ServiceAreaPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const areaPage = content.find(c => c.kind === "page" && c.slug === "service-area" && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";
  // Location coverage must require BOTH location verification + business verification
  const locations = content.filter(c => c.kind === "location" && c.status === "published" && (!isVerified || c.verificationStatus === "verified")).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <Metadata 
        title={areaPage?.seoTitle || "Service Area"}
        description={areaPage?.seoDescription || areaPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={areaPage?.title || "Areas We Serve"} 
        subtitle={areaPage?.summary || "Local garage door repair near you"}
        breadcrumbs={[{ label: "Service Area" }]}
      />

      <div className="phi-section bg-background relative overflow-hidden">
        {/* Background decorative map element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-border/40 opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full border border-border/20 opacity-20 pointer-events-none" />
        
        <div className="phi-container relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl uppercase tracking-tighter mb-6">Proudly Serving {settings?.serviceArea || "the Region"}</h2>
            {areaPage?.body && (
              <div className="text-lg text-muted-foreground font-medium leading-relaxed mb-6 space-y-4">
                {areaPage.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            )}
            
            {!isVerified && (
              <div className="mt-8 p-4 bg-muted/50 border border-border rounded-lg inline-block">
                <p className="text-sm font-medium">Please note: Exact coverage areas are subject to confirmation.</p>
              </div>
            )}
          </div>

          {locations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {locations.map(loc => (
                <Link key={loc.id} href={`/service-area/${loc.slug}`} className="group block">
                  <div className="phi-card bg-card border border-border p-8 h-full flex flex-col items-start gap-4 hover:border-primary transition-colors">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-2xl uppercase tracking-tight mt-2">{loc.title}</h3>
                    <p className="text-muted-foreground flex-grow line-clamp-2">{loc.summary}</p>
                    <span className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 mt-4">
                      View Location <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
             <div className="text-center py-20 bg-muted/30 border border-border rounded-xl">
               <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
               <h3 className="text-xl font-bold mb-2">Coverage Details Coming Soon</h3>
               <p className="text-muted-foreground">Contact us to verify service in your area.</p>
             </div>
          )}

          <div className="mt-20 flex flex-col items-center">
            <h3 className="font-display text-3xl uppercase tracking-tighter mb-4 text-center">Ready to schedule?</h3>
            <p className="font-serif italic text-xl text-muted-foreground mb-8 text-center max-w-xl">
              Request an assessment for your garage door needs.
            </p>
            <Button asChild size="lg" className="rounded-none font-bold uppercase tracking-widest px-12 h-14">
              <Link href="/book">Request Assessment</Link>
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}
