/**
 * Cache Store (Zustand)
 * Manages analysis results cache to reduce API calls
 */

import { create } from 'zustand'

interface CacheEntry {
  data: any
  timestamp: number
  expiresIn: number // milliseconds
}

interface CacheState {
  cache: Record<string, CacheEntry>
  get: (key: string) => any | null
  set: (key: string, data: any, expiresIn?: number) => void
  clear: () => void
  clearExpired: () => void
}

export const useCacheStore = create<CacheState>((set, get) => ({
  cache: {},

  get: (key: string) => {
    const entry = get().cache[key]
    
    if (!entry) return null
    
    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > entry.expiresIn) {
      // Remove expired entry
      set((state) => {
        const newCache = { ...state.cache }
        delete newCache[key]
        return { cache: newCache }
      })
      return null
    }
    
    return entry.data
  },

  set: (key: string, data: any, expiresIn = 300000) => { // Default 5 minutes
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: {
          data,
          timestamp: Date.now(),
          expiresIn
        }
      }
    }))
  },

  clear: () => {
    set({ cache: {} })
  },

  clearExpired: () => {
    const now = Date.now()
    set((state) => {
      const newCache: Record<string, CacheEntry> = {}
      
      Object.entries(state.cache).forEach(([key, entry]) => {
        if (now - entry.timestamp <= entry.expiresIn) {
          newCache[key] = entry
        }
      })
      
      return { cache: newCache }
    })
  }
}))

// Clear expired entries every 5 minutes
setInterval(() => {
  useCacheStore.getState().clearExpired()
}, 300000)
