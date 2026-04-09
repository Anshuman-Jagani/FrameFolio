import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { patch } from '../lib/api'

export type UserRole = 'client' | 'photographer' | 'admin'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  fullName?: string
}

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  login: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  setTokens: (tokens: { accessToken: string; refreshToken: string } | null) => void
  updateFullName: (fullName: string) => void
}

const FULL_NAME_KEY = 'framefolio_fullname'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        login: (user, tokens) => {
          const savedFullName = localStorage.getItem(FULL_NAME_KEY)
          const mergedUser = { ...user, fullName: savedFullName || user.fullName }
          set({ user: mergedUser, ...tokens })
        },
        logout: () => {
          localStorage.removeItem(FULL_NAME_KEY)
          set({ user: null, accessToken: null, refreshToken: null })
        },
        setUser: (user) => set({ user }),
        setTokens: (tokens) =>
          set({
            accessToken: tokens?.accessToken ?? null,
            refreshToken: tokens?.refreshToken ?? null,
          }),
        updateFullName: async (fullName) => {
           // Save to server/database
           try {
             await patch(`/users/me`, { full_name: fullName });
             
             // Update local state
             set((state) => ({
               user: state.user ? { ...state.user, fullName } : null,
             }));
           } catch (error) {
             console.error('Failed to update full name:', error);
             throw error;
           }
         },
      }
    },
    {
      name: 'framefolio_auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)

