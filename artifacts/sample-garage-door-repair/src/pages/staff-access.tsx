import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Redirect, useLocation } from "wouter";
import { Building2, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPage, { type StaffSession } from "./admin";
import { STAFF_ID_TOKEN_KEY, staffFetch, staffToken } from "@/lib/staff-auth";

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize(config: { client_id: string; callback: (response: { credential?: string }) => void }): void;
      renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    } } };
  }
}

async function getSession(): Promise<StaffSession> {
  const response = await staffFetch("/api/garage/admin/session", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "Staff access is unavailable."), { status: response.status });
  return body;
}

function GoogleSignIn({ onCredential }: { onCredential: (token: string) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) { setMessage("Google staff sign-in is not configured."); return; }
    const render = () => {
      if (!window.google || !target.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => credential ? onCredential(credential) : setMessage("Google did not return an ID token."),
      });
      window.google.accounts.id.renderButton(target.current, { theme: "outline", size: "large", text: "continue_with", width: 320 });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener("load", render); render(); return () => existing.removeEventListener("load", render); }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = render;
    document.head.append(script);
    return () => { script.onload = null; };
  }, [onCredential]);
  return <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
    <h1 className="text-2xl font-bold text-slate-950">Staff access</h1>
    <p className="mt-3 text-sm text-slate-600">Continue with your authorized Google account.</p>
    <div ref={target} className="mt-6 flex justify-center" />
    {message && <p className="mt-4 text-sm text-red-700">{message}</p>}
  </div>;
}

function StaffGate() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [signedIn, setSignedIn] = useState(() => Boolean(staffToken()));
  const previousAccess = useRef<string | null>(null);
  useEffect(() => {
    setAuthTokenGetter(staffToken);
    return () => setAuthTokenGetter(null);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const next = await getSession();
      if (previousAccess.current && previousAccess.current !== next.accessId) queryClient.clear();
      previousAccess.current = next.accessId; setSession(next); setError(null);
    } catch (reason) {
      queryClient.clear(); setSession(null);
      setError(reason instanceof Error ? reason : new Error("Staff access is unavailable."));
    }
  }, [queryClient]);
  useEffect(() => {
    if (!signedIn) { setSession(null); setError(null); queryClient.clear(); return; }
    void refresh(); const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [signedIn, queryClient, refresh]);

  const signOut = async () => { sessionStorage.removeItem(STAFF_ID_TOKEN_KEY); queryClient.clear(); setSignedIn(false); };
  if (!signedIn) {
    if (location.startsWith("/admin")) return <Redirect to="/sign-in" />;
    return <AuthShell><GoogleSignIn onCredential={(token) => { sessionStorage.setItem(STAFF_ID_TOKEN_KEY, token); setSignedIn(true); }} /></AuthShell>;
  }
  if (!session && !error) return <Loading />;
  if (error) return <AuthShell><div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
    <ShieldAlert className="mx-auto h-10 w-10 text-orange-700" /><h1 className="mt-4 text-2xl font-bold text-slate-950">Staff access required</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">{error.message}</p>
    <div className="mt-6 flex justify-center gap-3"><Button variant="outline" onClick={() => void refresh()}>Check again</Button><Button onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button></div>
  </div></AuthShell>;
  if (location.startsWith("/sign-in")) return <Redirect to="/admin" />;
  return <AdminPage session={session!} onSignOut={signOut} />;
}

function Loading() { return <AuthShell><Loader2 className="h-9 w-9 animate-spin text-orange-700" aria-label="Checking staff access" /></AuthShell>; }
function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-12"><div className="absolute left-6 top-6 flex items-center gap-2 text-white"><Building2 className="h-6 w-6 text-orange-500" /><span className="font-bold">Cumming Garage Door Service</span></div>{children}</main>;
}
export default function StaffAccessApp() { return <StaffGate />; }