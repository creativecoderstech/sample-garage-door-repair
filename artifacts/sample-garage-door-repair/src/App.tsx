import { type ReactNode, useEffect, useRef } from 'react';
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
import { ClerkProvider, SignIn, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';

import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { FloatingChat } from '@/components/floating-chat';
import { getPublicSectionRouterHref, scrollToPublicSectionId, type PublicSection } from '@/lib/public-navigation';

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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const configuredBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the app environment.');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: configuredBasePath || '/',
    logoImageUrl: `${window.location.origin}${configuredBasePath}/logo.svg`,
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#ea580c',
    colorForeground: '#172033',
    colorMutedForeground: '#64748b',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#172033',
    colorDanger: '#dc2626',
    colorNeutral: '#cbd5e1',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-950 font-display',
    headerSubtitle: 'text-slate-500',
    socialButtonsBlockButtonText: 'text-slate-700',
    formFieldLabel: 'text-slate-700',
    footerActionLink: 'text-orange-600 font-semibold',
    footerActionText: 'text-slate-500',
    dividerText: 'text-slate-500',
    identityPreviewEditButton: 'text-orange-600',
    formFieldSuccessText: 'text-emerald-700',
    alertText: 'text-red-700',
    logoBox: 'h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-slate-200 bg-white hover:bg-slate-50',
    formButtonPrimary: 'bg-orange-600 hover:bg-orange-700 text-white',
    formFieldInput: 'border-slate-200 bg-white text-slate-900',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-slate-200',
    alert: 'border-red-200 bg-red-50',
    otpCodeFieldInput: 'border-slate-200',
    formFieldRow: 'gap-1',
    main: 'bg-white',
  },
};

function stripBase(path: string, basePath: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

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
               <Redirect to="/sign-in" />
             </Route>
             <Route path="/sign-in/*?" component={SignInPage} />
             <Route path="/sign-up/*?" component={StaffProvisioningPage} />
            
            {/* Admin Route */}
             <Route path="/admin" component={ProtectedAdminRoute} />
            
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

function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Checking staff access…</p>
      </div>
    </div>
  );
}

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathBase = getActiveBasePath(window.location.pathname);

  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Redirect to="/admin" />;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4 py-10">
      <div className="w-full max-w-[440px]">
        <SignInShellHeader />
        <SignIn
          routing="path"
          path={`${pathBase}/sign-in`}
          fallbackRedirectUrl={`${pathBase}/admin`}
          appearance={clerkAppearance}
          withSignUp={false}
        />
      </div>
    </div>
  );
}

function SignInShellHeader() {
  return (
    <div className="mb-5 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Garage Door Service Preview</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Staff operations sign-in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use your approved staff account to access customer requests.</p>
    </div>
  );
}

function StaffProvisioningPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-6">
      <div className="phi-card w-full max-w-md border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Staff accounts are invite-only</h1>
        <p className="mt-3 leading-6 text-muted-foreground">
          Ask the business owner to provision your staff account, then return here to sign in.
        </p>
        <a className="mt-6 inline-flex font-semibold text-primary hover:underline" href="/sign-in">
          Return to staff sign-in
        </a>
      </div>
    </div>
  );
}

function ProtectedAdminRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AdminPage />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function getActiveBasePath(location: string) {
  return configuredBasePath &&
    (location === configuredBasePath || location.startsWith(`${configuredBasePath}/`))
    ? configuredBasePath
    : '';
}

function ClerkProviderWithRoutes({ routerBasePath }: { routerBasePath: string }) {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${routerBasePath}/sign-in`}
      routerPush={(to) => setLocation(stripBase(to, routerBasePath))}
      routerReplace={(to) => setLocation(stripBase(to, routerBasePath), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ThemeProvider defaultTheme="industrial">
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
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

  return (
    <WouterRouter base={routerBasePath}>
      <ClerkProviderWithRoutes routerBasePath={routerBasePath} />
    </WouterRouter>
  );
}

export default App;
