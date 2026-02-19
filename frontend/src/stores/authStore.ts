import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: Omit<User, 'password'>, token: string, refreshToken: string) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),

      hasRole: (role) => get().user?.role === role,
    }),
    { name: 'auth-storage' }
  )
);
