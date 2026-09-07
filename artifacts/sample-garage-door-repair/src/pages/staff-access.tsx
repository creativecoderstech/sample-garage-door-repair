import { useCallback, useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignIn, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import '@clerk/themes/shadcn.css';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocation } from 'wouter';
import { Building2, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminPage, { type StaffSession } from './admin';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
  },
  variables: {
    colorPrimary: '#c2410c', colorForeground: '#0f172a', colorMutedForeground: '#475569',
    colorDanger: '#dc2626', colorBackground: '#ffffff', colorInput: '#f8fafc',
    colorInputForeground: '#0f172a', colorNeutral: '#cbd5e1',
    fontFamily: 'Manrope, sans-serif', borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-950 font-bold', headerSubtitle: 'text-slate-600',
    socialButtonsBlockButtonText: 'text-slate-900 font-semibold', formFieldLabel: 'text-slate-800',
    footerActionLink: 'text-orange-700 font-bold', footerActionText: 'text-slate-600',
    dividerRow: 'hidden', dividerText: 'hidden', identityPreviewEditButton: 'text-orange-700',
    formFieldSuccessText: 'text-emerald-700', alertText: 'text-red-800',
    logoBox: 'h-14', logoImage: 'max-h-14', socialButtonsBlockButton: 'border-2 border-slate-200',
    formButtonPrimary: 'hidden', formFieldInput: 'border-2 border-slate-200',
    footerAction: 'hidden', dividerLine: 'bg-slate-200', alert: 'bg-red-50 border border-red-200',
    otpCodeFieldInput: 'border-slate-300', formFieldRow: 'hidden', main: 'gap-5',
  },
};

async function getSession(): Promise<StaffSession> {
  const response = await fetch('/api/garage/admin/session', { credentials: 'include', cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'Staff access is unavailable.'), { status: response.status });
  return body;
}

function StaffGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const previousAccess = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const next = await getSession();
      if (previousAccess.current && previousAccess.current !== next.accessId) queryClient.clear();
      previousAccess.current = next.accessId;
      setSession(next); setError(null);
    } catch (reason) {
      queryClient.clear();
      setSession(null);
      setError(reason instanceof Error ? reason : new Error('Staff access is unavailable.'));
    }
  }, [queryClient]);

  useEffect(() => {
    if (!isSignedIn) { setSession(null); setError(null); queryClient.clear(); return; }
    void refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [isSignedIn, queryClient, refresh]);

  if (!isLoaded) return <Loading />;
  if (!isSignedIn) {
    if (location.startsWith('/admin')) return <Redirect to="/sign-in" />;
    return (
      <AuthShell>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={undefined}
          forceRedirectUrl={`${basePath}/admin`}
          fallbackRedirectUrl={`${basePath}/admin`}
        />
      </AuthShell>
    );
  }
  if (!session && !error) return <Loading />;
  if (error) return (
    <AuthShell>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <ShieldAlert className="mx-auto h-10 w-10 text-orange-700" />
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Staff access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => void refresh()}>Check again</Button>
          <Button onClick={async () => { queryClient.clear(); await signOut({ redirectUrl: basePath || '/' }); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </AuthShell>
  );
  if (location.startsWith('/sign-in')) {
    return <Redirect to="/admin" />;
  }
  return <AdminPage session={session!} onSignOut={async () => {
    queryClient.clear();
    await signOut({ redirectUrl: basePath || '/' });
  }} />;
}

function Loading() {
  return <AuthShell><Loader2 className="h-9 w-9 animate-spin text-orange-700" aria-label="Checking staff access" /></AuthShell>;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-12">
      <div className="absolute left-6 top-6 flex items-center gap-2 text-white">
        <Building2 className="h-6 w-6 text-orange-500" />
        <span className="font-bold">Cumming Garage Door Service</span>
      </div>
      {children}
    </main>
  );
}

export default function StaffAccessApp() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: 'Cumming Garage Door Service staff',
            titleCombined: 'Cumming Garage Door Service staff',
            subtitle: 'Continue with your authorized Google account',
            subtitleCombined: 'Continue with your authorized Google account',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <StaffGate />
    </ClerkProvider>
  );
}