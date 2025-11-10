/**
 * Authentication Store (Zustand)
 * Manages user authentication state across extension
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: (token: string, user: User) => {
        set({ 
          isAuthenticated: true, 
          user, 
          token 
        })
        
        // Store in Chrome storage
        chrome.storage.local.set({ authToken: token, user })
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null 
        })
        
        // Clear Chrome storage
        chrome.storage.local.remove(['authToken', 'user'])
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }))
      }
    }),
    {
      name: 'mindhive-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token
      })
    }
  )
)
