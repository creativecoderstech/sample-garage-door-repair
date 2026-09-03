import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import NotFound from '@/pages/not-found';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { FloatingChat } from '@/components/floating-chat';
import { ThemeSwatch } from '@/components/theme-swatch';
import { getPublicSectionRouterHref, scrollToPublicSectionId, type PublicSection } from '@/lib/public-navigation';
import { trackPageReferral } from '@/lib/garage-analytics';

import HomePage from '@/pages/home';
import AdminPage from '@/pages/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const configuredBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function Router() {
  const [location] = useLocation();
  const isAdmin =
    location.startsWith('/admin') ||
    location === '/login' ||
    location.startsWith('/sign-in') ||
    location.startsWith('/sign-up');

  return (
    <RoutedErrorBoundary>
      <ScrollPositionManager />
      <div className="phi-app-shell flex flex-col">
        {!isAdmin && (
          <a
            href="#main-content"
            className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-background px-4 py-3 font-bold text-foreground shadow-lg focus:not-sr-only"
          >
            Skip to main content
          </a>
        )}
        {!isAdmin && <SiteHeader />}
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col outline-none">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/services">
              <LegacyPublicRoute section="services" />
            </Route>
            <Route path="/gallery">
              <LegacyPublicRoute section="gallery" />
            </Route>
            <Route path="/before-after">
              <LegacyPublicRoute section="beforeAfter" />
            </Route>
            <Route path="/faqs">
              <LegacyPublicRoute section="faqs" />
            </Route>
            <Route path="/book">
              <LegacyPublicRoute section="booking" />
            </Route>
             <Route path="/login">
               <Redirect to="/admin" />
             </Route>
             <Route path="/sign-in/*?">
               <Redirect to="/admin" />
             </Route>
             <Route path="/sign-up/*?">
               <Redirect to="/admin" />
             </Route>
            
            {/* Admin Route */}
             <Route path="/admin" component={AdminPage} />
            
            <Route component={NotFound} />
          </Switch>
        </main>
        {!isAdmin && (
          <>
            <SiteFooter />
            <FloatingChat />
             <ThemeSwatch />
          </>
        )}
      </div>
    </RoutedErrorBoundary>
  );
}

function LegacyPublicRoute({ section }: { section: PublicSection }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(getPublicSectionRouterHref(section));
  }, [section, setLocation]);

  return null;
}

function ScrollPositionManager() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const scrollToSection = () => {
      return scrollToPublicSectionId(hash, 'auto');
    };

    scrollToSection();
    const retry = window.setTimeout(scrollToSection, 150);
    const finalPosition = window.setTimeout(scrollToSection, 700);
    window.addEventListener('load', scrollToSection);

    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(finalPosition);
      window.removeEventListener('load', scrollToSection);
    };
  }, [location]);

  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const routerBasePath =
    configuredBasePath &&
    (window.location.pathname === configuredBasePath ||
      window.location.pathname.startsWith(`${configuredBasePath}/`))
      ? configuredBasePath
      : '';

  useEffect(() => {
    trackPageReferral();
  }, []);

  return (
    <WouterRouter base={routerBasePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="industrial">
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
