import { Link } from "wouter";

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs 
}: { 
  title: string; 
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="bg-muted/30 border-b border-border py-[var(--phi-space-5)] md:py-[var(--phi-space-6)] relative overflow-hidden">
      <div className="noise-overlay" />
      <div className="phi-container relative z-10">
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-[var(--phi-space-4)] flex flex-wrap items-center gap-[var(--phi-space-1)] text-xs font-medium text-muted-foreground uppercase tracking-wide font-sans">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex min-w-0 items-center gap-[var(--phi-space-1)]">
                <span>/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="garage-display text-4xl md:text-6xl lg:text-7xl uppercase text-foreground mb-[var(--phi-space-3)]">
          {title}
        </h1>
        {subtitle && (
          <p className="font-serif italic text-xl md:text-2xl text-muted-foreground max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
