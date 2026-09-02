import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query';

export type UserRole = 'super_admin' | 'admin' | 'member';
export type UserStatus = 'invited' | 'active' | 'disabled';

export type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  isSystem: boolean;
  invitedBy: number | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const authMeQueryKey = ['auth', 'me'] as const;
export const listUsersQueryKey = ['users'] as const;

export function useGetAuthMe(
  options?: Omit<
    UseQueryOptions<{ user: AdminUser }, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: () => apiFetch<{ user: AdminUser }>('/api/auth/me'),
    ...options,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  });
}

export function useListUsers() {
  return useQuery({
    queryKey: listUsersQueryKey,
    queryFn: () => apiFetch<{ users: AdminUser[] }>('/api/users'),
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: (args: {
      data: {
        email: string;
        role: 'admin' | 'member';
        name?: string;
      };
    }) =>
      apiFetch<{ user: AdminUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: (args: {
      id: number;
      data: {
        name?: string | null;
        role?: 'admin' | 'member';
        status?: UserStatus;
      };
    }) =>
      apiFetch<{ user: AdminUser }>(`/api/users/${args.id}`, {
        method: 'PATCH',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<{ ok: boolean }>(`/api/users/${args.id}`, { method: 'DELETE' }),
  });
}

export function getGetAuthMeQueryKey() {
  return authMeQueryKey;
}

export function getListUsersQueryKey() {
  return listUsersQueryKey;
}

export type SiteSettingsHero = {
  phone: string;
  ownerEmail: string;
  notifyFromEmail: string;
  notifyFromName: string;
  heroImageUrl: string;
};

async function apiFetchForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useUploadHeroImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('image', file);
      return apiFetchForm<SiteSettingsHero>('/api/settings/hero-image', form);
    },
  });
}

export function useResetHeroImage() {
  return useMutation({
    mutationFn: () =>
      apiFetch<SiteSettingsHero>('/api/settings/hero-image', {
        method: 'DELETE',
      }),
  });
}

// --- Services (local wrappers) ---

export type ServiceItem = {
  id: number;
  title: string;
  benefit: string;
  description: string;
  iconSlug: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceList = {
  items: ServiceItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ServiceInput = {
  title: string;
  benefit: string;
  description: string;
  iconSlug?: string;
  sortOrder?: number;
  published?: boolean;
};

export type ListServicesParams = {
  all?: '0' | '1';
  limit?: number;
  offset?: number;
};

function servicesQueryString(params?: ListServicesParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.all) search.set('all', params.all);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function getListServicesQueryKey(params?: ListServicesParams) {
  return ['/api/services', params] as const;
}

export async function listServices(params?: ListServicesParams): Promise<ServiceList> {
  return apiFetch<ServiceList>(`/api/services${servicesQueryString(params)}`);
}

export function useListServices(params?: ListServicesParams) {
  return useQuery({
    queryKey: getListServicesQueryKey(params),
    queryFn: () => listServices(params),
  });
}

export function useCreateService() {
  return useMutation({
    mutationFn: (args: { data: ServiceInput }) =>
      apiFetch<ServiceItem>('/api/services', {
        method: 'POST',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useUpdateService() {
  return useMutation({
    mutationFn: (args: { id: number; data: ServiceInput }) =>
      apiFetch<ServiceItem>(`/api/services/${args.id}`, {
        method: 'PUT',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useDeleteService() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<void>(`/api/services/${args.id}`, { method: 'DELETE' }),
  });
}

// --- FAQs (local wrappers; avoids orval/iCloud hangs) ---

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqList = {
  items: FaqItem[];
  total: number;
  limit: number;
  offset: number;
};

export type FaqInput = {
  question: string;
  answer: string;
  sortOrder?: number;
  published?: boolean;
};

export type ListFaqsParams = {
  all?: '0' | '1';
  limit?: number;
  offset?: number;
};

function faqsQueryString(params?: ListFaqsParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.all) search.set('all', params.all);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function getListFaqsQueryKey(params?: ListFaqsParams) {
  return ['/api/faqs', params] as const;
}

export async function listFaqs(params?: ListFaqsParams): Promise<FaqList> {
  return apiFetch<FaqList>(`/api/faqs${faqsQueryString(params)}`);
}

export function useListFaqs(params?: ListFaqsParams) {
  return useQuery({
    queryKey: getListFaqsQueryKey(params),
    queryFn: () => listFaqs(params),
  });
}

export function useCreateFaq() {
  return useMutation({
    mutationFn: (args: { data: FaqInput }) =>
      apiFetch<FaqItem>('/api/faqs', {
        method: 'POST',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useUpdateFaq() {
  return useMutation({
    mutationFn: (args: { id: number; data: FaqInput }) =>
      apiFetch<FaqItem>(`/api/faqs/${args.id}`, {
        method: 'PUT',
        body: JSON.stringify(args.data),
      }),
  });
}

export function useDeleteFaq() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<void>(`/api/faqs/${args.id}`, { method: 'DELETE' }),
  });
}

// --- Reviews moderation ---

export type ReviewItem = {
  id: number;
  name: string;
  location: string | null;
  service: string | null;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
};

export type ReviewList = {
  reviews: ReviewItem[];
};

export function useAdminListReviews() {
  return useQuery({
    queryKey: ['/api/admin/reviews'] as const,
    queryFn: () => apiFetch<ReviewList>('/api/admin/reviews'),
  });
}

export function useApproveReview() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<{ review: ReviewItem }>(`/api/admin/reviews/${args.id}/approve`, {
        method: 'PUT',
      }),
  });
}

export function useUnapproveReview() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<{ review: ReviewItem }>(`/api/admin/reviews/${args.id}/unapprove`, {
        method: 'PUT',
      }),
  });
}

export function useDeleteReview() {
  return useMutation({
    mutationFn: (args: { id: number }) =>
      apiFetch<void>(`/api/admin/reviews/${args.id}`, { method: 'DELETE' }),
  });
}
