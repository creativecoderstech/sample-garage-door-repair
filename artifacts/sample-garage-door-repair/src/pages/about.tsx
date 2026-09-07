import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { ShieldCheck, Award, HeartHandshake } from "lucide-react";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function AboutPage() {
  return (
    <ContentBoundary>
      <AboutPageContent />
    </ContentBoundary>
  );
}

function AboutPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const aboutPage = content.find(c => c.kind === "page" && c.slug === "about" && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";

  return (
    <>
      <Metadata 
        title={aboutPage?.seoTitle || "About Us"}
        description={aboutPage?.seoDescription || aboutPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={aboutPage?.title || "About Us"} 
        subtitle={aboutPage?.summary || "Our story and commitment to quality"}
        breadcrumbs={[{ label: "About" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-4xl">
          {aboutPage?.imageUrl && (
            <div className="w-full aspect-[21/9] overflow-hidden mb-[var(--phi-space-5)] bg-muted border border-border">
              <img src={publicAssetUrl(aboutPage.imageUrl)} alt={aboutPage.imageAlt || "About Us"} className="w-full h-full object-cover" />
            </div>
          )}
          
          {aboutPage?.body && (
            <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed mb-[var(--phi-space-6)] prose-headings:font-display prose-headings:uppercase">
              {aboutPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {isVerified && settings?.trustProfile && (
        <div className="phi-section-tight bg-muted/20 border-y border-border">
          <div className="phi-container">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--phi-space-4)]">
              {settings.trustProfile.yearsInBusiness && (
                <div className="flex flex-col items-center text-center gap-[var(--phi-space-3)]">
                  <div className="w-16 h-16 bg-background rounded-none flex items-center justify-center text-primary border border-border">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="garage-display text-3xl uppercase tracking-wide">Experience</h3>
                  <p className="text-muted-foreground font-serif italic">{settings.trustProfile.yearsInBusiness}</p>
                </div>
              )}
              {settings.trustProfile.licenseInsurance && (
                <div className="flex flex-col items-center text-center gap-[var(--phi-space-3)]">
                  <div className="w-16 h-16 bg-background rounded-none flex items-center justify-center text-primary border border-border">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="garage-display text-3xl uppercase tracking-wide">Licenses & Insurance</h3>
                  <p className="text-muted-foreground font-serif italic">{settings.trustProfile.licenseInsurance}</p>
                </div>
              )}
              {settings.trustProfile.warranty && (
                <div className="flex flex-col items-center text-center gap-[var(--phi-space-3)]">
                  <div className="w-16 h-16 bg-background rounded-none flex items-center justify-center text-primary border border-border">
                    <HeartHandshake className="w-8 h-8" />
                  </div>
                  <h3 className="garage-display text-3xl uppercase tracking-wide">Warranty</h3>
                  <p className="text-muted-foreground font-serif italic">{settings.trustProfile.warranty}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
