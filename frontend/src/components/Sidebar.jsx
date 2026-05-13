import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '../store'
import { authApi, whatsappApi } from '../api'
import toast from 'react-hot-toast'

/* ── Icons (defined first so they can be used in NAV array) ───────── */
function IcoDashboard() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
}
function IcoInbox() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
}
function IcoLeads() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
}
function IcoCampaigns() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
}
function IcoAuto() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
}
function IcoAnalytics() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
}
function IcoBilling() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
}
function IcoSettings() {
    return <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
}

const WA_ICON_SMALL = () => (
    <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.484 3.488" />
    </svg>
)

const NAV = [
    { to: '/dashboard', label: 'Dashboard', Icon: IcoDashboard },
    { to: '/inbox', label: 'Inbox', Icon: IcoInbox },
    { to: '/leads', label: 'Leads', Icon: IcoLeads },
    { to: '/campaigns', label: 'Campaigns', Icon: IcoCampaigns },
    { to: '/automation', label: 'Automation', Icon: IcoAuto },
    { to: '/analytics', label: 'Analytics', Icon: IcoAnalytics },
    { to: '/billing', label: 'Billing', Icon: IcoBilling },
    { to: '/settings', label: 'Settings', Icon: IcoSettings },
]

export default function Sidebar() {
    const { user, currentOrg, logout, refreshToken } = useAuthStore()
    const sidebarOpen = useUIStore((s) => s.sidebarOpen)
    const navigate = useNavigate()

    // WhatsApp connection status
    const [waStatus, setWaStatus] = useState(null) // null = loading, {connected, display_phone_number, display_name}

    useEffect(() => {
        if (!currentOrg) return
        whatsappApi.getStatus()
            .then(r => setWaStatus(r.data))
            .catch(() => setWaStatus({ connected: false }))
    }, [currentOrg])

    const handleLogout = async () => {
        try { await authApi.logout(refreshToken) } catch { }
        logout()
        navigate('/login')
        toast.success('Signed out')
    }

    const userInitial = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
    const userName = user?.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : user?.email || ''

    const sidebarStyle = {
        position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 40,
        display: 'flex', flexDirection: 'column',
        background: '#1c1917',
        transition: 'width 0.3s ease',
        width: sidebarOpen ? 224 : 56,
        userSelect: 'none',
    }

    return (
        <aside style={sidebarStyle}>
            {/* ── Logo ─────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 14px', height: 56, flexShrink: 0,
                borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7, background: '#2563eb', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg style={{ width: 15, height: 15, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                {sidebarOpen && (
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fafaf9', letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        ChatFlow<span style={{ color: '#93c5fd' }}>360</span>
                    </span>
                )}
            </div>

            {/* ── Workspace badge ────────────────────── */}
            {sidebarOpen && currentOrg && (
                <div style={{
                    margin: '10px 10px 4px', padding: '8px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 22, height: 22, borderRadius: 5, background: '#2563eb', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>
                            {currentOrg.name[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ color: '#e7e5e4', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {currentOrg.name}
                            </p>
                            <p style={{ color: '#78716c', fontSize: '0.68rem' }}>Workspace</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Navigation ───────────────────────────── */}
            <nav style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {NAV.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        title={!sidebarOpen ? label : ''}
                        className={({ isActive }) =>
                            `sidebar-link${isActive ? ' active' : ''}${!sidebarOpen ? ' justify-center' : ''}`
                        }
                        style={!sidebarOpen ? { padding: '8px 0' } : {}}
                    >
                        <Icon />
                        {sidebarOpen && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* ── WhatsApp Status ───────────────────────── */}
            <div style={{ padding: '0 8px 4px' }}>
                <button
                    onClick={() => navigate('/settings')}
                    title={waStatus?.connected ? `WhatsApp: ${waStatus.display_phone_number || waStatus.display_name}` : 'Connect WhatsApp'}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: sidebarOpen ? '8px 10px' : '8px 0',
                        justifyContent: sidebarOpen ? 'flex-start' : 'center',
                        background: waStatus?.connected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: waStatus?.connected ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = waStatus?.connected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = waStatus?.connected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)'}
                >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ color: waStatus?.connected ? '#22c55e' : '#6b7280' }}>
                            <WA_ICON_SMALL />
                        </div>
                        <span style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 6, height: 6, borderRadius: '50%',
                            background: waStatus?.connected ? '#22c55e' : '#6b7280',
                            border: '1px solid #1c1917',
                        }} />
                    </div>
                    {sidebarOpen && (
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: waStatus?.connected ? '#86efac' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {waStatus?.connected ? (waStatus.display_phone_number || waStatus.display_name || 'Connected') : 'Connect WhatsApp'}
                            </p>
                            <p style={{ fontSize: '0.62rem', color: waStatus?.connected ? 'rgba(134,239,172,0.6)' : '#52525b' }}>
                                {waStatus?.connected ? '● Active' : '○ Not connected'}
                            </p>
                        </div>
                    )}
                </button>
            </div>

            {/* ── User section ─────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 8px' }}>
                {sidebarOpen ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px' }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: '#3f3f46',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 600, color: '#d4d4d8',
                        }}>
                            {userInitial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#e7e5e4', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {userName}
                            </p>
                            <p style={{ color: '#78716c', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.email}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            style={{
                                color: '#78716c', background: 'none', border: 'none',
                                cursor: 'pointer', padding: 4, borderRadius: 5, flexShrink: 0,
                                display: 'flex', alignItems: 'center',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                            onMouseLeave={e => e.currentTarget.style.color = '#78716c'}
                        >
                            <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        style={{
                            width: '100%', display: 'flex', justifyContent: 'center',
                            padding: '8px 0', background: 'none', border: 'none',
                            cursor: 'pointer', color: '#78716c', borderRadius: 7,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#78716c'}
                    >
                        <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                )}
            </div>
        </aside>
    )
}
