import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAuthMe,
  useLogout,
  getGetAuthMeQueryKey,
  type AdminUser,
} from '@/lib/admin-api';

export type AuthContextValue = {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
  canEditContactSettings: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetAuthMe({
    retry: false,
    refetchOnWindowFocus: true,
  });
  const logoutMutation = useLogout();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (data?.user) setUser(data.user);
    else if (isError) setUser(null);
  }, [data, isError]);

  const value: AuthContextValue = {
    user,
    isLoading: isLoading && !user,
    isAuthenticated: Boolean(user),
    isSuperAdmin: user?.role === 'super_admin',
    isMember: user?.role === 'member',
    canEditContactSettings:
      user?.role === 'super_admin' || user?.role === 'admin',
    refresh: async () => {
      await refetch();
    },
    signOut: async () => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // Still clear local session view
      }
      setUser(null);
      await queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
