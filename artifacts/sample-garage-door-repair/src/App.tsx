import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { FloatingChat } from '@/components/floating-chat';

import HomePage from '@/pages/home';
import ServicesPage from '@/pages/services';
import GalleryPage from '@/pages/gallery';
import BeforeAfterPage from '@/pages/before-after';
import FaqsPage from '@/pages/faqs';
import BookPage from '@/pages/book';
import LoginPage from '@/pages/login';
import AdminPage from '@/pages/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function Router() {
  const [location] = useLocation();
  const isAdmin = location.startsWith('/admin') || location === '/login';

  return (
    <RoutedErrorBoundary>
      <ScrollPositionManager />
      <div className="flex flex-col min-h-[100dvh]">
        {!isAdmin && <SiteHeader />}
        <main className="flex-1 flex flex-col">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/gallery" component={GalleryPage} />
            <Route path="/before-after" component={BeforeAfterPage} />
            <Route path="/faqs" component={FaqsPage} />
            <Route path="/book" component={BookPage} />
            <Route path="/login" component={LoginPage} />
            
            {/* Admin Route */}
            <Route path="/admin" component={AdminPage} />
            
            <Route component={NotFound} />
          </Switch>
        </main>
        {!isAdmin && (
          <>
            <SiteFooter />
            <FloatingChat />
          </>
        )}
      </div>
    </RoutedErrorBoundary>
  );
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
      const element = document.getElementById(hash);
      if (!element) return false;
      const stickyHeaderOffset = 112;
      const top = element.getBoundingClientRect().top + window.scrollY - stickyHeaderOffset;
      window.scrollTo({ top, behavior: 'auto' });
      return true;
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="industrial">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
