import { Link, useRoute, Redirect } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import NotFound from "./not-found";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function BlogDetailPage() {
  return (
    <ContentBoundary>
      <BlogDetailPageContent />
    </ContentBoundary>
  );
}

function BlogDetailPageContent() {
  const [, params] = useRoute("/blog/:slug");
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const article = content.find(c => c.kind === "article" && c.slug === params?.slug && c.status === "published");
  const isVerified = settings?.verificationStatus === "verified";

  if (!article) {
    const aliased = content.find(c => c.kind === "article" && c.aliases?.includes(params?.slug || ""));
    if (aliased) {
      return <Redirect to={`/blog/${aliased.slug}`} />;
    }
    return <NotFound />;
  }

  return (
    <>
      <Metadata 
        title={article.seoTitle || `${article.title} | Blog`}
        description={article.seoDescription || article.summary}
        noindex={!isVerified}
        ogImage={article.imageUrl || undefined}
      />

      <article className="bg-background">
        <PageHeader 
          title={article.title} 
          breadcrumbs={[
            { label: "Blog", href: "/blog" },
            { label: article.title }
          ]}
        />
        
        <div className="phi-container max-w-4xl py-12 md:py-20">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground mb-8">
            <CalendarIcon className="w-4 h-4" />
            {new Date(article.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          {article.imageUrl && (
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-12 bg-muted shadow-sm">
              <img src={publicAssetUrl(article.imageUrl)} alt={article.imageAlt || article.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="prose prose-lg md:prose-xl dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed font-sans mb-16">
            {article.body.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
          
          <div className="border-t border-border pt-10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to all articles
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
