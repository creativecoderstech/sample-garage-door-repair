import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatWidget } from '@/components/ChatWidget';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  ADMIN_URL,
  isAdminHost,
  keepPathBasedAdmin,
  shouldRedirectAdminPath,
} from '@/lib/hosts';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

// Route-level code splitting — keeps the initial JS bundle lean.
// HomePage is eagerly loaded because it is the LCP page for all public visitors.
import HomePage from '@/pages/home';
const AdminPage = lazy(() => import('@/pages/admin'));
const LoginPage = lazy(() => import('@/pages/login'));
const GalleryBrowsePage = lazy(() => import('@/pages/gallery'));
const BeforeAfterBrowsePage = lazy(() => import('@/pages/before-after'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function AdminHostApp() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <AdminPage />
    </Suspense>
  );
}

function MarketingRouter() {
  const [location] = useLocation();
  const pathAdmin = keepPathBasedAdmin();

  useEffect(() => {
    if (
      shouldRedirectAdminPath() &&
      (location === '/admin' || location.startsWith('/admin/'))
    ) {
      window.location.replace(ADMIN_URL);
    }
  }, [location]);

  const hideChat =
    pathAdmin && (location === '/admin' || location.startsWith('/admin/'));

  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/gallery" component={GalleryBrowsePage} />
          <Route path="/before-after" component={BeforeAfterBrowsePage} />
          {pathAdmin ? (
            <Route
              path="/admin"
              component={() => (
                <AuthProvider>
                  <AdminHostApp />
                </AuthProvider>
              )}
            />
          ) : null}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {!hideChat && <ChatWidget />}
    </>
  );
}

function Router() {
  if (isAdminHost()) {
    return (
      <AuthProvider>
        <AdminHostApp />
      </AuthProvider>
    );
  }
  return <MarketingRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
