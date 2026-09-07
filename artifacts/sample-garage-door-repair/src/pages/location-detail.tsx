import { Link, useRoute, Redirect } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronRight } from "lucide-react";
import NotFound from "./not-found";
import { BookingForm } from "@/components/booking-form";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function LocationDetailPage() {
  return (
    <ContentBoundary>
      <LocationDetailPageContent />
    </ContentBoundary>
  );
}

function LocationDetailPageContent() {
  const [, params] = useRoute("/service-area/:slug");
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const location = content.find(c => c.kind === "location" && c.slug === params?.slug && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";
  
  // Location coverage requires BOTH location verification + business verification
  const isCoverageConfirmed = isVerified && location?.verificationStatus === "verified";
  
  if (!location || (!isCoverageConfirmed && isVerified)) {
    const aliased = content.find(c => c.kind === "location" && c.aliases?.includes(params?.slug || ""));
    if (aliased && (!isVerified || aliased.verificationStatus === "verified")) {
      return <Redirect to={`/service-area/${aliased.slug}`} />;
    }
    return <NotFound />;
  }

  const servicesList = content.filter(c => c.kind === "service" && c.status === "published");
  const otherLocations = content.filter(c => c.kind === "location" && c.status === "published" && c.id !== location.id && (!isVerified || c.verificationStatus === "verified")).slice(0, 5);

  return (
    <>
      <Metadata 
        title={location.seoTitle || `Garage Door Repair in ${location.title}`}
        description={location.seoDescription || location.summary}
        noindex={!isVerified}
        ogImage={location.imageUrl || undefined}
      />

      <PageHeader 
        title={location.title} 
        subtitle={location.summary}
        breadcrumbs={[
          { label: "Service Area", href: "/service-area" },
          { label: location.title }
        ]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            
            {/* Main Content */}
            <div className="w-full lg:w-[58%] xl:w-2/3">
              {location.imageUrl && (
                <div className="w-full aspect-[16/9] overflow-hidden mb-10 bg-muted border border-border">
                  <img src={publicAssetUrl(location.imageUrl)} alt={location.imageAlt || location.title} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed prose-headings:font-display prose-headings:uppercase">
                {location.body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              
              <div className="mt-16 bg-secondary text-secondary-foreground border border-border p-8 rounded-none flex items-center gap-6">
                <div className="hidden sm:flex w-16 h-16 bg-primary items-center justify-center flex-shrink-0 text-primary-foreground">
                  <MapPin className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="garage-display text-3xl uppercase tracking-wide mb-2">Local Garage Door Experts</h3>
                  <p className="text-secondary-foreground/80 font-serif italic text-lg">We're proud to provide reliable service directly to homes in {location.title}.</p>
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="w-full lg:w-[42%] xl:w-1/3">
              <div className="sticky top-28 flex flex-col gap-8">
                
                {/* Booking Widget */}
                <div id="booking" className="scroll-mt-28">
                  <BookingForm />
                </div>
                
                {/* Other Locations */}
                {otherLocations.length > 0 && (
                  <div className="bg-muted/30 border border-border p-6">
                    <h3 className="garage-display text-2xl uppercase tracking-wide mb-6">Nearby Areas</h3>
                    <ul className="flex flex-col gap-3">
                      {otherLocations.map(loc => (
                        <li key={loc.id}>
                          <Link href={`/service-area/${loc.slug}`} className="group flex items-center justify-between text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors py-2 border-b border-border/50">
                            {loc.title}
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
