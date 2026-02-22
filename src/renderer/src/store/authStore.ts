import { create } from 'zustand'
import type { UserProfile } from '../lib/api'

interface AuthState {
  isAuthenticated: boolean
  orgUrl: string
  profile: UserProfile | null
  setAuthenticated: (orgUrl: string) => void
  setProfile: (profile: UserProfile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  orgUrl: '',
  profile: null,
  setAuthenticated: (orgUrl) => set({ isAuthenticated: true, orgUrl }),
  setProfile: (profile) => set({ profile }),
  logout: () => set({ isAuthenticated: false, orgUrl: '', profile: null })
}))
