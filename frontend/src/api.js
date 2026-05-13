import axios from 'axios'

const API_BASE = '/api/v1'

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    // Attach org header if org is selected
    const orgId = localStorage.getItem('org_id')
    if (orgId) config.headers['X-Organization-ID'] = orgId

    return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            const refresh = localStorage.getItem('refresh_token')
            if (refresh) {
                try {
                    const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
                    localStorage.setItem('access_token', data.access)
                    original.headers.Authorization = `Bearer ${data.access}`
                    return api(original)
                } catch {
                    localStorage.clear()
                    window.location.href = '/login'
                }
            } else {
                localStorage.clear()
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
    register: (data) => api.post('/auth/register/', data),
    login: (data) => api.post('/auth/login/', data),
    logout: (refresh) => api.post('/auth/logout/', { refresh }),
    // New secure password reset flow
    forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
    resetPassword: (data) => api.post('/auth/reset-password/', data),
    // Legacy aliases kept for compat
    passwordResetRequest: (email) => api.post('/auth/forgot-password/', { email }),
    passwordResetConfirm: (data) => api.post('/auth/reset-password/', data),
}

// ── Organizations ─────────────────────────────────────────────────────
export const orgApi = {
    list: () => api.get('/organizations/'),
    create: (data) => api.post('/organizations/', data),
    members: (orgId) => api.get(`/organizations/${orgId}/members/`),
    invite: (orgId, data) => api.post(`/organizations/${orgId}/members/`, data),
    updateMember: (orgId, memberId, data) => api.patch(`/organizations/${orgId}/members/${memberId}/`, data),
    removeMember: (orgId, memberId) => api.delete(`/organizations/${orgId}/members/${memberId}/`),
}

// ── WhatsApp ─────────────────────────────────────────────────────────
export const whatsappApi = {
    // Connection config
    getConfig: () => api.get('/whatsapp/config/'),
    getStatus: () => api.get('/whatsapp/status/'),
    connect: (data) => api.post('/whatsapp/connect/', data),
    connectDemo: (data) => api.post('/whatsapp/connect-demo/', data),
    disconnect: () => api.delete('/whatsapp/config/'),
    testConnection: () => api.post('/whatsapp/test-connection/'),
    generateToken: () => api.post('/whatsapp/generate-token/'),
    getAnalytics: () => api.get('/whatsapp/analytics/'),
    // Accounts CRUD (admin)
    accounts: () => api.get('/whatsapp/accounts/'),
    createAccount: (data) => api.post('/whatsapp/accounts/', data),
    // Contacts
    contacts: (params) => api.get('/whatsapp/contacts/', { params }),
    createContact: (data) => api.post('/whatsapp/contacts/', data),
    // Auto-reply rules
    autoReplies: (params) => api.get('/whatsapp/auto-replies/', { params }),
    createAutoReply: (data) => api.post('/whatsapp/auto-replies/', data),
    updateAutoReply: (id, data) => api.patch(`/whatsapp/auto-replies/${id}/`, data),
    deleteAutoReply: (id) => api.delete(`/whatsapp/auto-replies/${id}/`),
    toggleAutoReply: (id) => api.patch(`/whatsapp/auto-replies/${id}/toggle/`),
}


// ── Conversations ─────────────────────────────────────────────────────
export const convoApi = {
    list: (params) => api.get('/conversations/', { params }),
    get: (id) => api.get(`/conversations/${id}/`),
    messages: (id) => api.get(`/conversations/${id}/messages/`),
    sendMessage: (id, content) => api.post(`/conversations/${id}/messages/`, { content }),
    assign: (id, agent_id) => api.post(`/conversations/${id}/assign/`, { agent_id }),
    resolve: (id) => api.post(`/conversations/${id}/resolve/`),
    reopen: (id) => api.post(`/conversations/${id}/reopen/`),
    markRead: (id) => api.post(`/conversations/${id}/mark-read/`),
    addTag: (id, tag) => api.post(`/conversations/${id}/tag/`, { tag }),
    notes: (id) => api.get(`/conversations/${id}/notes/`),
    addNote: (id, content) => api.post(`/conversations/${id}/notes/`, { content }),
}

// ── Leads ──────────────────────────────────────────────────────────────
export const leadsApi = {
    list: (params) => api.get('/leads/', { params }),
    kanban: () => api.get('/leads/kanban/'),
    get: (id) => api.get(`/leads/${id}/`),
    create: (data) => api.post('/leads/', data),
    update: (id, data) => api.patch(`/leads/${id}/`, data),
    move: (id, stage) => api.post(`/leads/${id}/move/`, { stage }),
    addNote: (id, content) => api.post(`/leads/${id}/notes/`, { content }),
    addReminder: (id, data) => api.post(`/leads/${id}/reminders/`, data),
}

// ── Campaigns ──────────────────────────────────────────────────────────
export const campaignsApi = {
    list: (params) => api.get('/campaigns/', { params }),
    get: (id) => api.get(`/campaigns/${id}/`),
    create: (data) => api.post('/campaigns/', data),
    update: (id, data) => api.patch(`/campaigns/${id}/`, data),
    launch: (id) => api.post(`/campaigns/${id}/launch/`),
    pause: (id) => api.post(`/campaigns/${id}/pause/`),
    contacts: (id) => api.get(`/campaigns/${id}/contacts/`),
    addContacts: (id, ids) => api.post(`/campaigns/${id}/add-contacts/`, { contact_ids: ids }),
}

// ── Automation ─────────────────────────────────────────────────────────
export const automationApi = {
    rules: () => api.get('/automation/rules/'),
    createRule: (data) => api.post('/automation/rules/', data),
    updateRule: (id, data) => api.patch(`/automation/rules/${id}/`, data),
    deleteRule: (id) => api.delete(`/automation/rules/${id}/`),
    toggleRule: (id) => api.patch(`/automation/rules/${id}/toggle/`),
    activity: () => api.get('/automation/rules/activity/'),
    flows: () => api.get('/automation/flows/'),
    createFlow: (data) => api.post('/automation/flows/', data),
    updateFlow: (id, data) => api.patch(`/automation/flows/${id}/`, data),
    deleteFlow: (id) => api.delete(`/automation/flows/${id}/`),
    toggleFlow: (id) => api.patch(`/automation/flows/${id}/toggle/`),
}


// ── Analytics ──────────────────────────────────────────────────────────
export const analyticsApi = {
    dashboard: () => api.get('/analytics/dashboard/'),
    campaign: (id) => api.get(`/analytics/campaigns/${id}/`),
}

// ── Subscriptions / Billing ────────────────────────────────────────────
export const billingApi = {
    plans: () => api.get('/subscriptions/plans/'),
    mySubscription: () => api.get('/subscriptions/my/'),
    subscribe: (plan_id) => api.post('/subscriptions/subscribe/', { plan_id }),
    cancelSubscription: () => api.post('/subscriptions/cancel/'),
    toggleAutoRenew: () => api.post('/subscriptions/toggle-renew/'),
    history: () => api.get('/payments/history/'),
}

// ── Notifications ──────────────────────────────────────────────────────
export const notificationsApi = {
    list: () => api.get('/notifications/'),
    markRead: (id) => api.patch(`/notifications/${id}/`, { is_read: true }),
}
