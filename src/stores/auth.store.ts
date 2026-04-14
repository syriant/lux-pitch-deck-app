import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginApi, refreshApi, logoutApi, getMeApi, microsoftLoginApi, type AuthUser, type LoginRequest } from '../api/auth.api';
import { getMsalInstance, loginRequest, isSsoConfigured } from '../config/msal';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  isSsoConfigured: boolean;
  refresh: () => Promise<string | null>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isSsoConfigured,

      login: async (data: LoginRequest) => {
        const res = await loginApi(data);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          isAuthenticated: true,
        });
      },

      loginWithMicrosoft: async () => {
        const msalInstance = await getMsalInstance();
        if (!msalInstance) {
          throw new Error('Microsoft SSO is not configured');
        }

        const result = await msalInstance.loginPopup(loginRequest);
        if (!result.idToken) {
          throw new Error('No ID token received from Microsoft');
        }

        const res = await microsoftLoginApi(result.idToken);
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          isAuthenticated: true,
        });
      },

      refresh: async () => {
        const token = get().refreshToken;
        if (!token) {
          return null;
        }
        try {
          const res = await refreshApi(token);
          set({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
          });
          return res.accessToken;
        } catch {
          return null;
        }
      },

      logout: () => {
        const token = get().accessToken;
        if (token) {
          logoutApi().catch(() => {});
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      loadUser: async () => {
        set({ isLoading: true });
        try {
          const user = await getMeApi();
          set({ user, isAuthenticated: true });
        } catch {
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'lux-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
