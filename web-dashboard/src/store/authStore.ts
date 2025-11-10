import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  tier: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          console.log('Attempting login with:', { email, passwordLength: password?.length });
          const { user, token } = await apiClient.login(email, password);

          set({
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              tier: user.plan.toUpperCase() as 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE',
            },
            token,
            isAuthenticated: true,
          });
          
          console.log('Login successful!', { user: user.email });
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Login failed';
          console.error('Login error:', { 
            message, 
            status: error.response?.status,
            data: error.response?.data,
            sentEmail: email,
            sentPasswordLength: password?.length 
          });
          throw new Error(message);
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const { user, token } = await apiClient.register(email, password, name);

          set({
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              tier: user.plan.toUpperCase() as 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE',
            },
            token,
            isAuthenticated: true,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Registration failed');
        }
      },

      logout: () => {
        apiClient.logout().catch(() => {/* ignore */});
        apiClient.clearToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        try {
          const token = get().token;
          if (!token) {
            return;
          }

          const user = await apiClient.getCurrentUser();
          set({ 
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              tier: user.plan.toUpperCase() as 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE',
            }
          });
        } catch (error) {
          // Token expired or invalid
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

