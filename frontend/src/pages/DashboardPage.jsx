import { useEffect, useState } from 'react'
import { analyticsApi, orgApi, whatsappApi } from '../api'
import { useAuthStore } from '../store'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const STAGE_COLORS = {
    NEW: '#2563eb',
    CONTACTED: '#7c3aed',
    INTERESTED: '#d97706',
    NEGOTIATION: '#dc2626',
    CLOSED_WON: '#16a34a',
    CLOSED_LOST: '#a1a1aa',
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, detail, accent = '#2563eb', icon }) {
    return (
        <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                </span>
                <span style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: accent + '14',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: accent,
                }}>{icon}</span>
            </div>
            <div>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {value ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                </p>
                {detail && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{detail}</p>}
            </div>
        </div>
    )
}

// ── Onboarding ─────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
    const { setCurrentOrg } = useAuthStore()
    const [step, setStep] = useState(1)
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)
    const navigate = useNavigate()

    const create = async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setBusy(true)
        try {
            const { data } = await orgApi.create({ name: name.trim() })
            setCurrentOrg(data)
            toast.success(`"${data.name}" created`)
            onDone(data)
            setStep(2)
        } catch { toast.error('Could not create workspace') }
        finally { setBusy(false) }
    }

    return (
        <div style={{
            minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 32, background: 'var(--bg-page)',
        }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                {/* Progress */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
                    {['Workspace', 'WhatsApp', 'Explore'].map((s, i) => {
                        const active = i + 1 === step
                        const done = i + 1 < step
                        return (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 999,
                                    background: done ? 'var(--green-light)' : active ? 'var(--accent-light)' : '#f3f4f6',
                                    border: `1px solid ${done ? 'var(--green-border)' : active ? 'var(--accent-border)' : '#e5e7eb'}`,
                                }}>
                                    <span style={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        background: done ? 'var(--green)' : active ? 'var(--accent)' : '#d1d5db',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 10, fontWeight: 700, color: '#fff',
                                    }}>
                                        {done ? '✓' : i + 1}
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 500,
                                        color: done ? 'var(--green-text)' : active ? 'var(--accent)' : '#9ca3af',
                                    }}>{s}</span>
                                </div>
                                {i < 2 && <div style={{ width: 20, height: 1, background: '#e5e7eb' }} />}
                            </div>
                        )
                    })}
                </div>

                {/* Cards */}
                {step === 1 && (
                    <div className="animate-fadeIn" style={{
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-md)',
                    }}>
                        <div style={{ marginBottom: 20 }}>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                Create your workspace
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                                Your team's home on ChatFlow360. You can rename it anytime.
                            </p>
                        </div>
                        <form onSubmit={create}>
                            <label className="label">Organization name</label>
                            <input
                                className="input"
                                placeholder="e.g. Acme Corp, My Agency"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus required
                                style={{ marginBottom: 16 }}
                            />
                            <button className="btn-primary" type="submit" disabled={busy || !name.trim()}
                                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                                {busy ? 'Creating…' : 'Create workspace'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fadeIn" style={{
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-md)',
                    }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                            Connect WhatsApp Business
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20 }}>
                            Link your WhatsApp Business API number to start receiving messages.
                        </p>
                        <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
                            {[
                                'Open Meta Business Suite → WhatsApp Manager',
                                'Copy your Phone Number ID and WABA ID',
                                'Generate a permanent System User Access Token',
                                'Go to Settings → WhatsApp Accounts and paste them',
                            ].map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
                                    <span style={{
                                        flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                                        background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                                        color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{i + 1}</span>
                                    <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(3)}>Skip for now</button>
                            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/settings')}>Open Settings</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fadeIn" style={{
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 28, boxShadow: 'var(--shadow-md)', textAlign: 'center',
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
                            background: 'var(--green-light)', border: '1px solid var(--green-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg style={{ width: 24, height: 24, color: 'var(--green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.01em' }}>You're all set!</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
                            Your workspace is ready. Start exploring the platform.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                            {[
                                { label: 'Inbox', desc: 'Manage conversations', path: '/inbox' },
                                { label: 'Leads', desc: 'Track your pipeline', path: '/leads' },
                                { label: 'Campaigns', desc: 'Send bulk messages', path: '/campaigns' },
                                { label: 'Automation', desc: 'Build workflows', path: '/automation' },
                            ].map(item => (
                                <button key={item.path} onClick={() => navigate(item.path)}
                                    style={{
                                        padding: '12px', background: 'var(--bg-muted)',
                                        border: '1px solid var(--border)', borderRadius: 8,
                                        textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s',
                                        fontFamily: 'var(--font)',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-input)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.label}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                                </button>
                            ))}
                        </div>
                        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => window.location.reload()}>
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function DashboardPage() {
    const [data, setData] = useState(null)
    const [waData, setWaData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [ready, setReady] = useState(false)
    const { currentOrg, setCurrentOrg } = useAuthStore()
    const navigate = useNavigate()

    useEffect(() => {
        const t = setTimeout(() => setReady(true), 700)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        if (!currentOrg) { setLoading(false); return }
        setLoading(true)
        analyticsApi.dashboard()
            .then(r => setData(r.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false))
        // Fetch WhatsApp analytics in parallel
        whatsappApi.getAnalytics()
            .then(r => setWaData(r.data))
            .catch(() => setWaData(null))
    }, [currentOrg])

    // Brief spinner while auto-org resolves
    if (!ready && !currentOrg) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <svg className="animate-spin" style={{ width: 22, height: 22, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }} />
                    <path fill="currentColor" style={{ opacity: 0.8 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        )
    }

    if (!currentOrg) return <Onboarding onDone={org => setCurrentOrg(org)} />

    if (loading) {
        return (
            <div style={{ padding: 28 }}>
                <div className="skeleton" style={{ height: 28, width: 160, marginBottom: 24 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
                    <div className="skeleton" style={{ height: 240, borderRadius: 10 }} />
                </div>
            </div>
        )
    }

    const trend = data?.daily_message_trend || []
    const leadsStages = data?.leads?.by_stage || []
    const agents = data?.agent_performance || []
    const displayTrend = trend.length > 0 ? trend : [...Array(7)].map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
        messages: 0,
    }))

    const S = { /* shared section style */
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 10, boxShadow: 'var(--shadow-sm)',
    }

    return (
        <div style={{ padding: 28, maxWidth: 1200 }}>

            {/* ── Header ───────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Dashboard
                    </h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {currentOrg.name} · Last 30 days
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 999,
                        background: 'var(--green-light)', border: '1px solid var(--green-border)',
                        fontSize: '0.75rem', fontWeight: 500, color: 'var(--green-text)',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} className="animate-pulse" />
                        Live
                    </span>
                    <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={() => navigate('/settings')}>
                        Settings
                    </button>
                </div>
            </div>

            {/* ── Setup banner (no data yet) ──────────── */}
            {!data && (
                <div style={{
                    ...S, padding: '14px 18px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 14,
                    borderLeft: '3px solid var(--accent)',
                }}>
                    <svg style={{ width: 18, height: 18, color: 'var(--accent)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Connect WhatsApp to see live analytics
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Add a WhatsApp Business number in Settings to start tracking messages.
                        </p>
                    </div>
                    <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '7px 12px', flexShrink: 0 }}
                        onClick={() => navigate('/settings')}>
                        Connect
                    </button>
                </div>
            )}

            {/* ── WhatsApp Status Widget ───────────────── */}
            {waData && (
                <div style={{ ...S, padding: '16px 20px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#25d36614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg style={{ width: 16, height: 16 }} fill="#25d366" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.484 3.488" />
                                </svg>
                            </div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp Business</p>
                        </div>
                        {waData.connection?.connected ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Connected · {waData.connection.display_phone_number || waData.connection.display_name}
                            </span>
                        ) : (
                            <button onClick={() => navigate('/settings')} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '5px 12px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Connect WhatsApp
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        {[
                            { label: 'Inbound (30d)', val: waData.messages?.inbound_30d ?? 0, color: '#2563eb' },
                            { label: 'Outbound (30d)', val: waData.messages?.outbound_30d ?? 0, color: '#7c3aed' },
                            { label: 'Open Convos', val: waData.conversations?.open ?? 0, color: '#d97706' },
                            { label: 'Resolved (30d)', val: waData.conversations?.resolved_30d ?? 0, color: '#16a34a' },
                            { label: 'Total Contacts', val: waData.contacts?.total ?? 0, color: '#0891b2' },
                        ].map(m => (
                            <div key={m.label} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</p>
                                <p style={{ fontSize: '1.3rem', fontWeight: 700, color: m.color, letterSpacing: '-0.02em' }}>{m.val.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── KPI Grid ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
                <KpiCard
                    label="Total Messages"
                    value={data?.messages?.total?.toLocaleString() ?? '0'}
                    detail={`${data?.messages?.last_30_days ?? 0} this month`}
                    accent="#2563eb"
                    icon={<svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
                />
                <KpiCard
                    label="Conversations"
                    value={data?.conversations?.total?.toLocaleString() ?? '0'}
                    detail={`${data?.conversations?.open ?? 0} open · ${data?.conversations?.resolved_30d ?? 0} resolved`}
                    accent="#7c3aed"
                    icon={<svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
                />
                <KpiCard
                    label="Total Leads"
                    value={data?.leads?.total?.toLocaleString() ?? '0'}
                    detail={`${data?.leads?.conversion_rate ?? 0}% conversion rate`}
                    accent="#16a34a"
                    icon={<svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
                <KpiCard
                    label="Campaigns"
                    value={data?.campaigns?.total_30d ?? '0'}
                    detail={`${data?.campaigns?.completed ?? 0} completed`}
                    accent="#d97706"
                    icon={<svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
                />
            </div>

            {/* ── Charts ───────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 20 }}>
                {/* Area chart */}
                <div style={{ ...S, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Inbound Messages
                        </p>
                        <span style={{
                            fontSize: '0.75rem', fontWeight: 500,
                            color: 'var(--text-muted)',
                            background: 'var(--bg-muted)', border: '1px solid var(--border)',
                            padding: '2px 8px', borderRadius: 999,
                        }}>Last 7 days</span>
                    </div>
                    <ResponsiveContainer width="100%" height={190}>
                        <AreaChart data={displayTrend} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0eeea" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false}
                                tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    background: '#fff', border: '1px solid var(--border)',
                                    borderRadius: 8, boxShadow: 'var(--shadow-md)',
                                    fontSize: 12, color: 'var(--text-primary)',
                                }}
                                cursor={{ stroke: '#e4e1db', strokeWidth: 1 }}
                            />
                            <Area type="monotone" dataKey="messages" stroke="#2563eb" strokeWidth={2}
                                fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Lead pipeline */}
                <div style={{ ...S, padding: '18px 20px' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                        Lead Pipeline
                    </p>
                    {leadsStages.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={130}>
                                <PieChart>
                                    <Pie data={leadsStages} dataKey="count" nameKey="stage"
                                        cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={2}>
                                        {leadsStages.map(s => (
                                            <Cell key={s.stage} fill={STAGE_COLORS[s.stage] || '#a1a1aa'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{
                                        background: '#fff', border: '1px solid var(--border)',
                                        borderRadius: 8, fontSize: 12,
                                    }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {leadsStages.slice(0, 5).map(s => (
                                    <div key={s.stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[s.stage] || '#a1a1aa', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{s.stage.replace(/_/g, ' ')}</span>
                                        </div>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
                            <svg style={{ width: 28, height: 28, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>No leads yet</p>
                            <button onClick={() => navigate('/leads')} style={{
                                fontSize: '0.78rem', color: 'var(--accent)', background: 'none',
                                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textDecoration: 'underline'
                            }}>Add your first lead →</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Agent Performance ─────────────────────── */}
            {agents.length > 0 && (
                <div style={{ ...S, overflow: 'hidden' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                    }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Agent Performance
                        </p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 30 days</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: 20 }}>Agent</th>
                                <th>Assigned</th>
                                <th>Resolved</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(a => {
                                const rate = a.total_assigned ? Math.round((a.resolved / a.total_assigned) * 100) : 0
                                const barColor = rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--red)'
                                return (
                                    <tr key={a.assigned_to__email}>
                                        <td style={{ paddingLeft: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: '#f4f4f5', border: '1px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                                                    flexShrink: 0
                                                }}>
                                                    {((a.assigned_to__first_name?.[0] || '') + (a.assigned_to__last_name?.[0] || '') || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {a.assigned_to__first_name} {a.assigned_to__last_name}
                                                    </p>
                                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.assigned_to__email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{a.total_assigned}</td>
                                        <td>{a.resolved}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, maxWidth: 80, height: 5, background: '#f0eeea', borderRadius: 999, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${rate}%`, background: barColor, borderRadius: 999, transition: 'width 0.6s ease' }} />
                                                </div>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: barColor, minWidth: 30 }}>{rate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Quick actions when empty ──────────────── */}
            {!data && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginTop: 20 }}>
                    {[
                        { label: 'Go to Inbox', sub: 'Manage conversations', path: '/inbox' },
                        { label: 'Manage Leads', sub: 'Track your pipeline', path: '/leads' },
                        { label: 'Campaigns', sub: 'Send bulk messages', path: '/campaigns' },
                    ].map(item => (
                        <button key={item.path} onClick={() => navigate(item.path)}
                            style={{
                                padding: '14px 16px', background: '#fff',
                                border: '1px solid var(--border)', borderRadius: 10,
                                textAlign: 'left', cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'box-shadow 0.15s, border-color 0.15s',
                                fontFamily: 'var(--font)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--border-input)' }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                        >
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{item.label}</p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.sub}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
