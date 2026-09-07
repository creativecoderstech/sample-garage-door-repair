import { ReactNode } from "react";
import { useListGarageContent, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CORE_PAGE_ROUTES } from "@/lib/content-routes";
import NotFound from "@/pages/not-found";

export function ContentBoundary({ 
  children, 
}: { 
  children: ReactNode; 
}) {
  const [location] = useLocation();
  const { data: content = [], isLoading: contentLoading, isError: contentError, refetch: refetchContent } = useListGarageContent();
  const { isLoading: settingsLoading, isError: settingsError, refetch: refetchSettings } = useGetPublicBusinessSettings();

  if (contentLoading || settingsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-[var(--phi-space-3)]" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading content...</p>
      </div>
    );
  }

  if (contentError || settingsError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-[var(--phi-space-4)] bg-background">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-[var(--phi-space-4)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>
        <h2 className="text-3xl font-display uppercase tracking-tight mb-[var(--phi-space-2)]">Content Unavailable</h2>
        <p className="text-muted-foreground max-w-md mb-[var(--phi-space-4)]">We were unable to load the page content. Please check your connection and try again.</p>
        <Button onClick={() => { refetchContent(); refetchSettings(); }} size="lg" className="font-bold uppercase tracking-widest rounded-none">
          Try Again
        </Button>
      </div>
    );
  }

  const path = location.split("#")[0].replace(/\/$/, "") || "/";
  const coreSlug = Object.entries(CORE_PAGE_ROUTES).find(([, route]) => route === path)?.[0];
  if (coreSlug && !content.some(item => item.kind === "page" && item.slug === coreSlug && item.status === "published")) {
    return <NotFound />;
  }

  return <>{children}</>;
}
