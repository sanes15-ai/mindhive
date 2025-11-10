/**
 * Settings Store (Zustand)
 * Manages extension settings and preferences
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SiteSettings {
  enabled: boolean
  autoVerify: boolean
  showHUD: boolean
}

interface SettingsState {
  // Global settings
  globalEnabled: boolean
  autoVerifyCode: boolean
  showFloatingHUD: boolean
  learnFromActivity: boolean
  hudPosition: { x: number; y: number }
  
  // Per-site settings
  siteSettings: Record<string, SiteSettings>
  
  // Actions
  toggleGlobal: () => void
  updateSettings: (settings: Partial<Omit<SettingsState, 'siteSettings' | 'toggleGlobal' | 'updateSettings' | 'updateSiteSettings' | 'getSiteSettings'>>) => void
  updateSiteSettings: (domain: string, settings: Partial<SiteSettings>) => void
  getSiteSettings: (domain: string) => SiteSettings
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Defaults
      globalEnabled: true,
      autoVerifyCode: true,
      showFloatingHUD: true,
      learnFromActivity: true,
      hudPosition: { x: window.innerWidth - 80, y: window.innerHeight - 80 },
      siteSettings: {},

      toggleGlobal: () => {
        set((state) => ({ globalEnabled: !state.globalEnabled }))
      },

      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }))
      },

      updateSiteSettings: (domain: string, settings: Partial<SiteSettings>) => {
        set((state) => ({
          siteSettings: {
            ...state.siteSettings,
            [domain]: {
              ...(state.siteSettings[domain] || {
                enabled: true,
                autoVerify: true,
                showHUD: true
              }),
              ...settings
            }
          }
        }))
      },

      getSiteSettings: (domain: string) => {
        const settings = get().siteSettings[domain]
        return settings || {
          enabled: true,
          autoVerify: true,
          showHUD: true
        }
      }
    }),
    {
      name: 'mindhive-settings'
    }
  )
)
