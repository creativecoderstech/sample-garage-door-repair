import { lazy, Suspense, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatWidget } from '@/components/ChatWidget';
import { AppearancePicker } from '@/components/AppearancePicker';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { setupPreviewFetch, PreviewAuthProvider } from '@/lib/preview-mode';
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
const ForBusinessesPage = lazy(() => import('@/pages/for-businesses'));
const NotFound = lazy(() => import('@/pages/not-found'));

// Install the preview-mode fetch interceptor as early as possible (synchronously,
// before any React renders) so React Query sees demo data on its first fetch.
if (typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'true') {
  setupPreviewFetch();
}

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

/** Renders the real AdminPage in preview mode — no auth, demo data via fetch intercept. */
function PreviewAdminApp() {
  const previewQueryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
        },
      }),
    [],
  );
  return (
    <QueryClientProvider client={previewQueryClient}>
      <PreviewAuthProvider>
        <Suspense fallback={<PageFallback />}>
          <AdminPage />
        </Suspense>
      </PreviewAuthProvider>
    </QueryClientProvider>
  );
}

function MarketingRouter() {
  const [location] = useLocation();
  const pathAdmin = keepPathBasedAdmin();
  const isAdminPreview =
    (location === '/admin' || location.startsWith('/admin/')) &&
    new URLSearchParams(window.location.search).get('preview') === 'true';

  useEffect(() => {
    if (
      !isAdminPreview &&
      shouldRedirectAdminPath() &&
      (location === '/admin' || location.startsWith('/admin/'))
    ) {
      window.location.replace(ADMIN_URL);
    }
  }, [location, isAdminPreview]);

  const hideChat =
    isAdminPreview ||
    (pathAdmin && (location === '/admin' || location.startsWith('/admin/')));

  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/gallery" component={GalleryBrowsePage} />
          <Route path="/before-after" component={BeforeAfterBrowsePage} />
          <Route path="/for-businesses" component={ForBusinessesPage} />
          {/* /admin: preview mode (no auth) OR real admin (path-based only) */}
          <Route
            path="/admin"
            component={() =>
              isAdminPreview ? (
                <PreviewAdminApp />
              ) : pathAdmin ? (
                <AuthProvider>
                  <AdminHostApp />
                </AuthProvider>
              ) : null
            }
          />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {!hideChat && <AppearancePicker />}
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
