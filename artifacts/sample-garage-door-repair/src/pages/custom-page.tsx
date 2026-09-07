import { useRoute, Redirect } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import NotFound from "./not-found";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function CustomPage() {
  return (
    <ContentBoundary>
      <CustomPageContent />
    </ContentBoundary>
  );
}

function CustomPageContent() {
  const [, params] = useRoute("/pages/:slug");
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const page = content.find(c => c.kind === "page" && c.slug === params?.slug && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";

  const corePages = ["home", "services", "service-area", "about", "blog", "contact", "gallery", "faqs"];
  if (!page || corePages.includes(page.slug)) {
    const aliased = content.find(c => c.kind === "page" && c.aliases?.includes(params?.slug || ""));
    if (aliased && !corePages.includes(aliased.slug)) {
      return <Redirect to={`/pages/${aliased.slug}`} />;
    }
    return <NotFound />;
  }

  return (
    <>
      <Metadata 
        title={page.seoTitle || page.title}
        description={page.seoDescription || page.summary}
        noindex={!isVerified}
        ogImage={page.imageUrl || undefined}
      />

      <PageHeader 
        title={page.title} 
        subtitle={page.summary}
        breadcrumbs={[{ label: page.title }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-4xl">
          {page.imageUrl && (
            <div className="w-full aspect-[16/9] overflow-hidden mb-[var(--phi-space-5)] bg-muted border border-border">
              <img src={publicAssetUrl(page.imageUrl)} alt={page.imageAlt || page.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed prose-headings:font-display prose-headings:uppercase">
            {page.body.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
