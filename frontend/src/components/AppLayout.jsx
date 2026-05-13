import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { useUIStore, useAuthStore } from '../store'
import { orgApi, notificationsApi } from '../api'

export default function AppLayout() {
    const { sidebarOpen, toggleSidebar } = useUIStore()
    const { currentOrg, setCurrentOrg, setOrgs, user } = useAuthStore()
    const [notifCount, setNotifCount] = useState(0)
    const navigate = useNavigate()

    // Auto-load orgs and auto-select first
    useEffect(() => {
        orgApi.list()
            .then((r) => {
                const list = r.data.results || r.data
                setOrgs(list)
                if (!currentOrg && list.length > 0) setCurrentOrg(list[0])
            })
            .catch(() => { })
    }, [])

    // Load notification count
    useEffect(() => {
        notificationsApi.list()
            .then((r) => {
                const items = r.data.results || r.data
                setNotifCount(items.filter(n => !n.is_read).length)
            })
            .catch(() => { })
    }, [])

    const sidebarW = sidebarOpen ? 224 : 56

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: sidebarW, transition: 'margin-left 0.3s', minWidth: 0 }}>
                {/* ── Topbar ──────────────────────────────── */}
                <header style={{
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                    gap: 12,
                }}>
                    {/* Hamburger */}
                    <button
                        onClick={toggleSidebar}
                        style={{
                            padding: '6px 7px', borderRadius: 6, border: 'none',
                            background: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                        <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div style={{ flex: 1 }} />

                    {/* Workspace pill */}
                    {currentOrg && (
                        <button
                            onClick={() => navigate('/settings')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '5px 10px',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border)',
                                borderRadius: 7,
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 500,
                                lineHeight: 1,
                                fontFamily: 'var(--font)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-input)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            <span style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0
                            }}>
                                {currentOrg.name[0].toUpperCase()}
                            </span>
                            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {currentOrg.name}
                            </span>
                            <svg style={{ width: 12, height: 12, color: 'var(--text-muted)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}

                    {/* User identity chip */}
                    {user && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '4px 10px 4px 5px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: 7,
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            lineHeight: 1,
                        }}>
                            <span style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: '#2563eb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                                {(
                                    user.first_name?.[0] ||
                                    user.username?.[0] ||
                                    user.email?.[0] ||
                                    'U'
                                ).toUpperCase()}
                            </span>
                            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.first_name
                                    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`.trim()
                                    : user.username || user.email || 'User'}
                            </span>
                        </div>
                    )}

                    {/* Notification bell */}
                    <button
                        onClick={() => navigate('/settings')}
                        style={{
                            position: 'relative', padding: '6px 7px', borderRadius: 6,
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                        <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {notifCount > 0 && (
                            <span style={{
                                position: 'absolute', top: 3, right: 3,
                                width: 14, height: 14, borderRadius: '50%',
                                background: '#ef4444', border: '2px solid var(--bg-card)',
                                fontSize: 8, fontWeight: 700, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {notifCount > 9 ? '9+' : notifCount}
                            </span>
                        )}
                    </button>
                </header>

                {/* Page content — scrollable for standard pages; Inbox/Leads override with their own overflow */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
