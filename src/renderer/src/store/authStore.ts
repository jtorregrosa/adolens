import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  orgUrl: string
  setAuthenticated: (orgUrl: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  orgUrl: '',
  setAuthenticated: (orgUrl) => set({ isAuthenticated: true, orgUrl }),
  logout: () => set({ isAuthenticated: false, orgUrl: '' })
}))
