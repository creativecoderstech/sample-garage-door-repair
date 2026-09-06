import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Metadata } from "@/components/seo-metadata";
import { Image as ImageIcon } from "lucide-react";
import { publicAssetUrl } from "@/lib/asset-url";
import { ContentBoundary } from "@/components/layout/content-boundary";

export default function GalleryPage() {
  return (
    <ContentBoundary>
      <GalleryPageContent />
    </ContentBoundary>
  );
}

function GalleryPageContent() {
  const { data: content = [] } = useListGarageContent();
  const { data: settings } = useGetPublicBusinessSettings();

  const galleryPage = content.find(c => c.kind === "page" && c.slug === "gallery" && c.status === "published");
  const projects = content.filter(c => c.kind === "project" && c.status === "published").sort((a, b) => a.sortOrder - b.sortOrder);
  const isVerified = settings?.verificationStatus === "verified";
  
  // Projects that have both imageUrl and beforeImageUrl for the Before/After section
  const comparisonProjects = projects.filter(p => p.imageUrl && p.beforeImageUrl);

  return (
    <>
      <Metadata 
        title={galleryPage?.seoTitle || "Project Gallery"}
        description={galleryPage?.seoDescription || galleryPage?.summary}
        noindex={!isVerified}
      />

      <PageHeader 
        title={galleryPage?.title || "Our Work"} 
        subtitle={galleryPage?.summary || "See our recent projects"}
        breadcrumbs={[{ label: "Gallery" }]}
      />

      <div className="phi-section bg-background">
        <div className="phi-container max-w-7xl">
          {galleryPage?.body && (
            <div className="text-center max-w-3xl mx-auto mb-16 text-lg text-muted-foreground font-medium leading-relaxed space-y-4">
              {galleryPage.body.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div id={`project-${project.slug}`} key={project.id} className="group relative overflow-hidden rounded-xl aspect-square bg-card border border-border flex flex-col scroll-mt-24">
                  {project.imageUrl ? (
                    <>
                      <img src={publicAssetUrl(project.imageUrl)} alt={project.imageAlt || project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      {!isVerified && project.verificationStatus !== "verified" && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded z-10">
                          Representative
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 md:p-8">
                        <h3 className="font-display text-2xl uppercase tracking-wider text-white mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{project.title}</h3>
                        <p className="text-white/80 line-clamp-3 text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">{project.summary || project.body}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/20">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                      <h3 className="font-display text-xl uppercase tracking-wider mb-2 text-foreground">{project.title}</h3>
                      <p className="text-sm line-clamp-3">{project.summary || project.body}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-24 bg-muted/20 border border-border rounded-xl">
               <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
               <h3 className="font-display text-3xl uppercase tracking-tighter mb-4">No projects yet</h3>
               <p className="font-serif italic text-xl text-muted-foreground">Check back soon for examples of our work.</p>
             </div>
          )}
          
          {comparisonProjects.length > 0 && (
            <div id="before-after" className="mt-24 pt-16 border-t border-border scroll-mt-24">
              <div className="text-center mb-16">
                <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tighter text-foreground mb-4">Before & After</h2>
                <p className="font-serif italic text-xl text-muted-foreground">The difference a new door makes.</p>
              </div>
              
              <div className="ba-grid">
                {comparisonProjects.map(project => (
                  <div key={`ba-${project.id}`} className="ba-card flex flex-col group">
                    <div className="ba-compare">
                      <div className="ba-pane relative">
                        <span className="ba-tag ba-tag-before shadow-md">Before</span>
                        <img src={publicAssetUrl(project.beforeImageUrl)} alt={`Before ${project.title}`} />
                      </div>
                      <div className="ba-pane relative">
                        <span className="ba-tag ba-tag-after shadow-md">After</span>
                        <img src={publicAssetUrl(project.imageUrl)} alt={`After ${project.title}`} />
                      </div>
                    </div>
                    <div className="ba-meta bg-card">
                      <h3 className="font-display text-xl uppercase tracking-tight mb-2 group-hover:text-primary transition-colors">{project.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">{project.summary || project.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!isVerified && projects.length > 0 && (
            <div className="mt-16 p-4 bg-muted/50 border border-border rounded-lg text-center max-w-2xl mx-auto">
              <p className="text-sm font-medium text-muted-foreground">Note: Representative projects are shown for illustrative purposes and do not represent confirmed completed jobs.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
