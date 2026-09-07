import { Link } from "wouter";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { ArrowRight, CalendarIcon } from "lucide-react";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function BlogPage() {
  return (
    <ContentBoundary>
      <BlogPageContent />
    </ContentBoundary>
  );
}

function BlogPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const blogPage = content.find(c => c.kind === "page" && c.slug === "blog" && c.status === "published");
  const articles = content.filter(c => c.kind === "article" && c.status === "published").sort((a, b) => {
    if (!a.updatedAt && !b.updatedAt) return 0;
    if (!a.updatedAt) return 1;
    if (!b.updatedAt) return -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const isVerified = settings?.verificationStatus === "verified";

  return (
    <>
      <Metadata 
        title={blogPage?.seoTitle || "Blog & Insights"}
        description={blogPage?.seoDescription || blogPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={blogPage?.title || "Blog & Insights"} 
        subtitle={blogPage?.summary || "Tips, tricks, and news about garage doors"}
        breadcrumbs={[{ label: "Blog" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-5xl">
          {blogPage?.body && (
            <div className="prose prose-lg dark:prose-invert max-w-none mb-[var(--phi-space-6)] font-medium text-foreground/80 leading-relaxed text-center">
              {blogPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--phi-space-5)]">
              {articles.map(article => (
                <article key={article.id} className="group flex flex-col overflow-hidden bg-card rounded-none border border-border">
                  {article.imageUrl && (
                    <Link href={`/blog/${article.slug}`} className="block h-56 overflow-hidden bg-muted">
                      <img src={publicAssetUrl(article.imageUrl)} alt={article.imageAlt || article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </Link>
                  )}
                  <div className="p-[var(--phi-space-4)] md:p-[var(--phi-space-4)] flex flex-col flex-grow">
                    {article.updatedAt && (
                      <div className="flex items-center gap-[var(--phi-space-1)] text-xs font-bold uppercase tracking-widest text-muted-foreground mb-[var(--phi-space-3)]">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(article.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    )}
                    <Link href={`/blog/${article.slug}`}>
                      <h2 className="garage-display text-2xl uppercase tracking-wide mb-[var(--phi-space-2)] group-hover:text-primary transition-colors">{article.title}</h2>
                    </Link>
                    <p className="text-muted-foreground mb-[var(--phi-space-4)] flex-grow line-clamp-3">{article.summary}</p>
                    <Link href={`/blog/${article.slug}`} className="inline-flex items-center gap-[var(--phi-space-1)] text-sm font-bold uppercase tracking-widest text-primary w-fit">
                      Read Article <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-[var(--phi-space-7)] bg-muted/20 border border-border rounded-[var(--phi-radius)]">
               <h3 className="font-display text-3xl uppercase tracking-tighter mb-[var(--phi-space-3)]">No articles yet</h3>
               <p className="font-serif italic text-xl text-muted-foreground">Check back soon for new content.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
