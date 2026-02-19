import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Tenant } from '@/types';

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  refreshToken: string | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (user: Omit<User, 'password'>, token: string, refreshToken: string, tenant?: Tenant | null) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  isSuperAdmin: () => boolean;
  setTenant: (tenant: Tenant) => void;
  clearMustChangePassword: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tenant: null,
      isAuthenticated: false,
      mustChangePassword: false,

      login: (user, token, refreshToken, tenant) =>
        set({
          user,
          token,
          refreshToken,
          tenant: tenant ?? null,
          isAuthenticated: true,
          mustChangePassword: !!user.mustChangePassword,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          tenant: null,
          isAuthenticated: false,
          mustChangePassword: false,
        }),

      hasRole: (role) => get().user?.role === role,

      isSuperAdmin: () => get().user?.role === 'super_admin',

      setTenant: (tenant) => set({ tenant }),

      clearMustChangePassword: () => {
        const user = get().user;
        if (user) {
          set({
            mustChangePassword: false,
            user: { ...user, mustChangePassword: false },
          });
        }
      },
    }),
    { name: 'auth-storage' }
  )
);
