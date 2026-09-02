import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
const heroImage = '/hero.jpg';
import { PUBLIC_ORIGIN } from '@/lib/hosts';

/** True when running on localhost or a Replit preview domain — no fetch needed. */
function isDevHost(): boolean {
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.replit.dev') ||
    h.endsWith('.replit.app') ||
    h.endsWith('.localhost')
  );
}

const AUTH_ERRORS: Record<string, string> = {
  not_invited:
    'This Google account is not invited. Ask a Super Admin to add your email.',
  disabled: 'This account has been disabled. Contact a Super Admin.',
  invalid_state: 'Sign-in session expired. Please try again.',
  not_configured: 'Google Sign-In is not configured on the server yet.',
  token_exchange_failed: 'Google sign-in failed. Please try again.',
  profile_failed: 'Could not read your Google profile. Please try again.',
  email_unverified: 'Verify your Google email address, then try again.',
};

const ease = [0.22, 1, 0.36, 1] as const;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const isDev = isDevHost();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('authError');
    if (code) {
      setError(AUTH_ERRORS[code] ?? 'Sign-in failed. Please try again.');
      params.delete('authError');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-primary-foreground">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease }}
      >
        <img
          src={heroImage}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      </motion.div>

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, hsl(152 48% 10% / 0.9) 0%, hsl(152 40% 14% / 0.75) 45%, hsl(28 55% 28% / 0.5) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(25 85% 52% / 0.24), transparent 68%)' }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(152 55% 32% / 0.35), transparent 70%)' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
          className="flex w-full max-w-lg flex-col items-center text-center"
        >
          <div
            className="mb-2 flex w-full flex-col items-center px-6 py-10 sm:px-10 sm:py-12"
            style={{
              background:
                'radial-gradient(ellipse 85% 70% at 50% 45%, hsl(145 30% 97% / 0.97) 0%, hsl(145 25% 96% / 0.92) 55%, hsl(145 20% 96% / 0) 100%)',
              borderRadius: '2rem',
            }}
          >
            <motion.img
              src="/sample-handyman-logo.png"
              alt="Mike's Handyman Service"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease }}
              className="w-auto"
              style={{ height: '9rem' }}
              width={280}
              height={175}
            />

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.55, delay: 0.28, ease }}
              className="mt-6 origin-center rounded-full bg-accent"
              style={{ height: 2, width: 64 }}
            />

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32, ease }}
              className="mt-5 max-w-sm font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Admin access
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4, ease }}
              className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              Sign in to manage requests, bookings, and site content.
            </motion.p>

            {error ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 w-full max-w-sm rounded-xl border border-accent/40 bg-secondary px-4 py-3 text-sm text-foreground"
                role="alert"
              >
                {error}
              </motion.p>
            ) : null}

            <motion.a
              href="/api/auth/google"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.44, ease }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              className="mt-6 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-95"
              style={{ height: '3.25rem', fontSize: 15 }}
            >
              <GoogleGlyph />
              Sign in with Google
            </motion.a>

            {isDev && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6, ease }}
                className="mt-4 w-full max-w-xs"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-muted-foreground/20" />
                  <span className="text-xs text-muted-foreground/60 font-medium">dev only</span>
                  <div className="h-px flex-1 bg-muted-foreground/20" />
                </div>
                <motion.a
                  href="/api/auth/dev-login"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50/80 font-semibold text-amber-800 transition-colors hover:bg-amber-100/80"
                  style={{ height: '3.25rem', fontSize: 15 }}
                >
                  <span className="text-lg">🔓</span>
                  Continue as Dev Admin
                </motion.a>
              </motion.div>
            )}
          </div>

          <motion.a
            href={PUBLIC_ORIGIN}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6 text-sm font-medium underline-offset-4 transition-opacity hover:underline"
            style={{ color: 'hsl(145 25% 90% / 0.9)' }}
          >
            Back to website
          </motion.a>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
