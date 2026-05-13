import { create } from 'zustand'

export const useAuthStore = create((set) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    accessToken: localStorage.getItem('access_token') || null,
    refreshToken: localStorage.getItem('refresh_token') || null,
    currentOrg: JSON.parse(localStorage.getItem('current_org') || 'null'),
    orgs: [],

    setAuth: (user, access, refresh) => {
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        set({ user, accessToken: access, refreshToken: refresh })
    },

    setCurrentOrg: (org) => {
        localStorage.setItem('current_org', JSON.stringify(org))
        localStorage.setItem('org_id', org.id)
        set({ currentOrg: org })
    },

    setOrgs: (orgs) => set({ orgs }),

    logout: () => {
        localStorage.clear()
        // Also wipe WhatsApp setup flags so next login re-evaluates
        localStorage.removeItem('whatsapp_connected')
        localStorage.removeItem('whatsapp_skipped')
        set({ user: null, accessToken: null, refreshToken: null, currentOrg: null, orgs: [] })
    },

    isAuthenticated: () => !!localStorage.getItem('access_token'),
}))

export const useUIStore = create((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
