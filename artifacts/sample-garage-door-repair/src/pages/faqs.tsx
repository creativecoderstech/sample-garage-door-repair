import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { HelpCircle } from "lucide-react";

export default function FaqsPage() {
  const { data: content = [], isLoading: contentLoading } = useListGarageContent();
  const { data: settings, isLoading: settingsLoading } = useGetPublicBusinessSettings();

  const faqsPage = content.find(c => c.kind === "page" && c.slug === "faqs" && c.status === "published");
  const faqs = content.filter(c => c.kind === "faq" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);
  const isVerified = settings?.verificationStatus === "verified";
  
  if (contentLoading || settingsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse flex gap-[var(--phi-space-1)]"><div className="w-3 h-3 bg-primary rounded-full"></div><div className="w-3 h-3 bg-primary rounded-full delay-75"></div><div className="w-3 h-3 bg-primary rounded-full delay-150"></div></div></div>;
  }

  return (
    <>
      <Metadata 
        title={faqsPage?.seoTitle || "Frequently Asked Questions"}
        description={faqsPage?.seoDescription || faqsPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={faqsPage?.title || "FAQs"} 
        subtitle={faqsPage?.summary || "Everything you need to know about our services"}
        breadcrumbs={[{ label: "FAQs" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-4xl">
          {faqsPage?.body && (
            <div className="text-center mx-auto mb-[var(--phi-space-6)] text-lg text-muted-foreground font-medium leading-relaxed space-y-[var(--phi-space-3)]">
              {faqsPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          {faqs.length > 0 ? (
            <div className="flex flex-col gap-[var(--phi-space-4)]">
              {faqs.map(faq => (
                <div key={faq.id} className="bg-card border border-border p-[var(--phi-space-4)] md:p-[var(--phi-space-4)] rounded-none">
                  <h3 className="garage-display text-2xl uppercase tracking-wide mb-[var(--phi-space-3)] flex items-start gap-[var(--phi-space-3)]">
                    <span className="text-primary mt-1">Q.</span> {faq.title}
                  </h3>
                  <div className="text-muted-foreground pl-9 font-medium leading-relaxed prose prose-lg dark:prose-invert">
                    {(faq.body || faq.summary).split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-[var(--phi-space-7)] bg-muted/20 border border-border rounded-[var(--phi-radius)]">
               <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-[var(--phi-space-3)] opacity-50" />
               <h3 className="font-display text-3xl uppercase tracking-tighter mb-[var(--phi-space-3)]">No questions yet</h3>
               <p className="font-serif italic text-xl text-muted-foreground">Contact us if you have any questions.</p>
             </div>
          )}
        </div>
      </div>
    </>
  );
}
