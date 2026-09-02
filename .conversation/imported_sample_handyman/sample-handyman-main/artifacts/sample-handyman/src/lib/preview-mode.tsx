/**
 * preview-mode.tsx
 *
 * Utilities for rendering the real admin UI in an unauthenticated iframe context.
 * Used by the /for-businesses page to show the live admin dashboard with demo data.
 *
 * Two exports:
 *  - setupPreviewFetch()   — call once at app init to intercept API calls
 *  - PreviewAuthProvider   — wraps children with a fake auth context (no OAuth needed)
 */

import { ReactNode, useMemo } from 'react';
import { AuthContext, type AuthContextValue } from '@/lib/auth';

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_SERVICE_REQUESTS = {
  items: [
    {
      id: 1,
      name: 'Carlos M.',
      email: null,
      phone: '(512) 555-0192',
      service: 'TV Mounting',
      description: 'Would like to mount a 65" TV above the fireplace. Cables hidden in wall.',
      preferredDate: null,
      preferredTime: null,
      status: 'pending',
      urgency: 'flexible',
      source: 'website',
      photoUrls: [],
      videoUrls: [],
      jobAddress: '1842 Lamar Blvd, Austin, TX 78701',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      name: 'Jennifer P.',
      email: null,
      phone: '(512) 555-0247',
      service: 'Furniture Assembly',
      description: 'Full bedroom set from IKEA — bed frame, dresser, two nightstands.',
      preferredDate: null,
      preferredTime: null,
      status: 'contacted',
      urgency: 'soon',
      source: 'website',
      photoUrls: [],
      videoUrls: [],
      jobAddress: '304 Palm Valley Blvd, Round Rock, TX 78664',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      name: 'David K.',
      email: null,
      phone: '(512) 555-0318',
      service: 'Plumbing Repair',
      description: 'Leaky kitchen faucet and slow bathroom drain.',
      preferredDate: null,
      preferredTime: null,
      status: 'scheduled',
      urgency: 'urgent',
      source: 'website',
      photoUrls: [],
      videoUrls: [],
      jobAddress: '901 Quest Pkwy, Cedar Park, TX 78613',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      name: 'Rosa L.',
      email: null,
      phone: '(512) 555-0461',
      service: 'Drywall Patch',
      description: 'Two small holes from old TV bracket.',
      preferredDate: null,
      preferredTime: null,
      status: 'completed',
      urgency: 'flexible',
      source: 'website',
      photoUrls: [],
      videoUrls: [],
      jobAddress: '3220 Williams Dr, Georgetown, TX 78628',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  total: 4,
  limit: 20,
  offset: 0,
  pendingCount: 1,
};

const DEMO_SUMMARY = {
  totalRequests: 4,
  pendingCount: 1,
  byService: [
    { service: 'TV Mounting', count: 1 },
    { service: 'Furniture Assembly', count: 1 },
    { service: 'Plumbing Repair', count: 1 },
    { service: 'Drywall Patch', count: 1 },
  ],
};

const DEMO_GALLERY = {
  items: [
    { id: 1, label: 'TV Mounting', alt: 'TV mounted above fireplace', imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80', sortOrder: 1, published: true, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, label: 'Plumbing Repair', alt: 'Under-sink plumbing repair', imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&q=80', sortOrder: 2, published: true, createdAt: '2026-01-01T00:00:00Z' },
    { id: 3, label: 'Furniture Assembly', alt: 'IKEA bedroom assembly', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', sortOrder: 3, published: true, createdAt: '2026-01-01T00:00:00Z' },
    { id: 4, label: 'Cabinet Work', alt: 'Kitchen cabinet repair', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', sortOrder: 4, published: true, createdAt: '2026-01-01T00:00:00Z' },
    { id: 5, label: 'Shelving Install', alt: 'Wall shelves installed', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', sortOrder: 5, published: true, createdAt: '2026-01-01T00:00:00Z' },
  ],
  total: 5,
  limit: 24,
  offset: 0,
};

const DEMO_REVIEWS = {
  reviews: [
    {
      id: 1,
      name: 'Sarah M.',
      location: 'Austin, TX',
      service: 'TV Mounting',
      rating: 5,
      text: 'Mike mounted our 65" TV and ran all the cables through the wall. Flawless work.',
      approved: true,
      createdAt: '2026-08-12T00:00:00Z',
    },
    {
      id: 2,
      name: 'Marcus J.',
      location: 'Round Rock, TX',
      service: 'Plumbing Repair',
      rating: 5,
      text: 'Fixed a leaky faucet and installed two ceiling fans. Done in under two hours.',
      approved: true,
      createdAt: '2026-08-08T00:00:00Z',
    },
    {
      id: 3,
      name: 'Jennifer P.',
      location: 'Cedar Park, TX',
      service: 'Furniture Assembly',
      rating: 5,
      text: "Assembled an entire office's worth of furniture. Professional and efficient.",
      approved: true,
      createdAt: '2026-08-03T00:00:00Z',
    },
  ],
};

const DEMO_SETTINGS = {
  phone: '(512) 244-8550',
  ownerEmail: 'mike@mikeshandyman.com',
  notifyFromEmail: 'notify@mikeshandyman.com',
  notifyFromName: "Mike's Handyman Service",
  heroImageUrl: '/hero.jpg',
  thumbtackRating: '4.9',
  thumbtackReviewCount: '47',
  taskrabbitRating: '4.8',
  taskrabbitReviewCount: '32',
  googleReviewUrl: '',
  googlePlaceId: '',
  themeId: 'default',
  themeMode: 'light' as const,
  fontId: 'inter',
};

const EMPTY_LIST = { items: [], total: 0, limit: 20, offset: 0 };
const EMPTY_ARRAY: unknown[] = [];

function getDemoData(pathname: string): unknown {
  if (pathname === '/api/service-requests/summary') return DEMO_SUMMARY;
  if (pathname.startsWith('/api/service-requests')) return DEMO_SERVICE_REQUESTS;
  if (pathname.startsWith('/api/gallery')) return DEMO_GALLERY;
  if (pathname === '/api/admin/reviews') return DEMO_REVIEWS;
  if (pathname.startsWith('/api/google-reviews')) return { reviews: [] };
  if (pathname.startsWith('/api/settings')) return DEMO_SETTINGS;
  // /api/bookings returns a bare array (Booking[]), not a paginated object
  if (pathname.startsWith('/api/bookings')) return [];
  if (pathname.startsWith('/api/chat')) return EMPTY_LIST;
  if (pathname.startsWith('/api/tasks')) return { items: [], total: 0 };
  if (pathname.startsWith('/api/faqs')) return { faqs: EMPTY_ARRAY };
  if (pathname.startsWith('/api/services')) return { services: EMPTY_ARRAY };
  if (pathname.startsWith('/api/users')) return { users: EMPTY_ARRAY };
  // Safe fallback for any unknown GET
  return { items: [], total: 0, data: [], results: [] };
}

// ─── Fetch interceptor ────────────────────────────────────────────────────────

/**
 * Call once (idempotent) at app startup when `?preview=true` is in the URL.
 * Overrides window.fetch so all /api/* GET requests return demo data and all
 * mutations are silently swallowed (returns { ok: true }).
 */
// Extend Window with the preview-mode flag so TypeScript is satisfied.
declare global {
  interface Window { __previewFetchInstalled?: boolean }
}

export function setupPreviewFetch(): void {
  if (window.__previewFetchInstalled) return;
  window.__previewFetchInstalled = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;

    let pathname: string;
    try {
      pathname = new URL(urlStr, window.location.origin).pathname;
    } catch {
      return original(input, init);
    }

    if (!pathname.startsWith('/api/')) {
      return original(input, init);
    }

    const method = ((init?.method) ?? 'GET').toUpperCase();

    if (method !== 'GET') {
      // All writes are no-ops in preview mode — return a plausible success body
      return new Response(JSON.stringify({ ok: true, id: 1, message: 'Demo mode — changes are not saved' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = getDemoData(pathname);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

// ─── Fake auth provider ───────────────────────────────────────────────────────

const PREVIEW_AUTH_VALUE: AuthContextValue = {
  user: {
    id: 1,
    email: 'mike@mikeshandyman.com',
    name: 'Mike (Demo)',
    avatarUrl: null,
    role: 'admin',
    status: 'active',
    isSystem: false,
    invitedBy: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2026-08-17T00:00:00Z',
  },
  isLoading: false,
  isAuthenticated: true,
  isSuperAdmin: false,
  isMember: false,
  canEditContactSettings: false,
  refresh: async () => {},
  signOut: async () => {},
};

/**
 * Provides a fake, always-authenticated auth context without any OAuth calls.
 * Use this to wrap AdminPage when rendering in preview/iframe mode.
 */
export function PreviewAuthProvider({ children }: { children: ReactNode }) {
  // Memoise so the value reference is stable across re-renders
  const value = useMemo(() => PREVIEW_AUTH_VALUE, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
