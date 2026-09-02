import type { ReactNode } from 'react';
import { Link } from 'wouter';
const logoFullImage = '/logo-full.svg';

type BrowseShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function BrowseShell({ title, subtitle, children }: BrowseShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <img src={logoFullImage} alt="Penny Lane Home Solutions" className="h-[2.59rem] w-auto" width={221} height={56} />
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/#booking"
              className="text-sm font-display font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-md px-3 py-2"
            >
              Book a Service
            </a>
            <Link
              href="/"
              className="text-sm font-semibold text-primary hover:text-accent transition-colors hidden sm:inline"
            >
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 lg:px-12 py-10 md:py-14">
        <div className="mb-8 md:mb-10 max-w-2xl">
          <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
