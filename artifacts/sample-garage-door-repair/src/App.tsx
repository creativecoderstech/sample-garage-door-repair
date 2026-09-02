import { type ReactNode } from 'react';
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

import HomePage from '@/pages/home';
import ServicesPage from '@/pages/services';
import BookPage from '@/pages/book';
import LoginPage from '@/pages/login';
import AdminDashboardPage from '@/pages/admin-dashboard';
import AdminSettingsPage from '@/pages/admin-settings';

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
      <div className="flex flex-col min-h-[100dvh]">
        <SiteHeader />
        <main className="flex-1 flex flex-col">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/book" component={BookPage} />
            <Route path="/login" component={LoginPage} />
            
            {/* Admin Routes */}
            <Route path="/admin" component={AdminDashboardPage} />
            <Route path="/admin/settings" component={AdminSettingsPage} />
            
            <Route component={NotFound} />
          </Switch>
        </main>
        {!isAdmin && <SiteFooter />}
      </div>
    </RoutedErrorBoundary>
  );
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
