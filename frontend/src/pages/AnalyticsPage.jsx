import { useEffect, useState, useCallback } from 'react'
import { analyticsApi } from '../api'
import { useAuthStore } from '../store'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'

/* ── Short date label ─────────────────────────────────────────────── */
function shortDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

/* ── Custom tooltip ───────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: '#fff', border: '1px solid #e4e1db',
            borderRadius: 8, padding: '8px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '0.8rem',
        }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 3 }}>{shortDate(label)}</p>
            <p style={{ fontWeight: 700, color: '#2563eb' }}>{payload[0].value} messages</p>
        </div>
    )
}

/* ── KPI Card ─────────────────────────────────────────────────────── */
function Card({ label, value, icon, accent, loading }) {
    return (
        <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
        }}>
            {/* Icon bubble */}
            <div style={{
                width: 44, height: 44,
                borderRadius: 10,
                background: accent + '14',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '1.2rem',
            }}>
                {icon}
            </div>

            <div>
                <p style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: 6,
                }}>
                    {label}
                </p>
                {loading ? (
                    <div style={{
                        width: 64, height: 28, borderRadius: 6,
                        background: 'linear-gradient(90deg, #f0eeea 25%, #e8e5e0 50%, #f0eeea 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.4s infinite',
                    }} />
                ) : (
                    <p style={{
                        fontSize: '1.75rem', fontWeight: 800,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                        {value ?? '—'}
                    </p>
                )}
            </div>
        </div>
    )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
    const { currentOrg } = useAuthStore()
    const [data, setData]     = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]   = useState(false)

    const load = useCallback(async () => {
        if (!currentOrg) return
        setLoading(true)
        setError(false)
        try {
            const r = await analyticsApi.dashboard()
            setData(r.data)
        } catch (err) {
            // 403 typically means org header not yet set — don't show error banner
            if (err?.response?.status !== 403) setError(true)
        } finally {
            setLoading(false)
        }
    }, [currentOrg])

    useEffect(() => { load() }, [load])

    // If no org yet, retry every 2s until one is available
    useEffect(() => {
        if (currentOrg) return
        const t = setInterval(() => {
            const stored = localStorage.getItem('org_id')
            if (stored) load()
        }, 2000)
        return () => clearInterval(t)
    }, [currentOrg, load])

    /* Derived values */
    const totalMessages    = data?.messages?.total         ?? null
    const messagesThisMonth= data?.messages?.last_30_days  ?? null
    const openConversations= data?.conversations?.open     ?? null
    const totalLeads       = data?.leads?.total            ?? null
    const trend            = data?.daily_message_trend     || []

    const hasChartData = trend.some(d => d.messages > 0)

    return (
        <div style={{ padding: '28px 28px', background: 'var(--bg-page)', minHeight: '100%' }}>

            {/* Shimmer keyframe */}
            <style>{`
                @keyframes shimmer {
                    0%   { background-position: 200% 0 }
                    100% { background-position: -200% 0 }
                }
            `}</style>

            {/* ── Header ───────────────────────────────────── */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{
                        fontSize: '1.3rem', fontWeight: 800,
                        color: 'var(--text-primary)', letterSpacing: '-0.02em',
                    }}>
                        Analytics
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        Platform overview — last 30 days
                    </p>
                </div>

                <button
                    onClick={load}
                    title="Refresh"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '7px 13px',
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 8, cursor: 'pointer',
                        fontSize: '0.78rem', color: 'var(--text-secondary)',
                        fontFamily: 'var(--font)', fontWeight: 500,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                >
                    <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* ── Error State ────────────────────────────────── */}
            {error && (
                <div style={{
                    padding: '14px 18px', marginBottom: 24,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 10, fontSize: '0.82rem', color: '#dc2626',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span>⚠️</span>
                    <span>Failed to load analytics. <button onClick={load} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', fontFamily: 'var(--font)', padding: 0 }}>Try again</button></span>
                </div>
            )}

            {/* ── 4 KPI Cards ─────────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
            }}>
                <Card
                    label="Total Messages"
                    value={totalMessages?.toLocaleString()}
                    icon="💬" accent="#2563eb"
                    loading={loading}
                />
                <Card
                    label="Messages This Month"
                    value={messagesThisMonth?.toLocaleString()}
                    icon="📨" accent="#7c3aed"
                    loading={loading}
                />
                <Card
                    label="Open Conversations"
                    value={openConversations?.toLocaleString()}
                    icon="📬" accent="#d97706"
                    loading={loading}
                />
                <Card
                    label="Total Leads"
                    value={totalLeads?.toLocaleString()}
                    icon="🎯" accent="#16a34a"
                    loading={loading}
                />
            </div>

            {/* ── Messages per Day Chart ─────────────────────── */}
            <div style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '22px 22px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
                {/* Chart header */}
                <div style={{ marginBottom: 20 }}>
                    <h2 style={{
                        fontSize: '0.95rem', fontWeight: 700,
                        color: 'var(--text-primary)',
                    }}>
                        Messages per Day
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Inbound messages — last 7 days
                    </p>
                </div>

                {/* Chart body */}
                {loading ? (
                    /* Loading skeleton */
                    <div style={{
                        height: 240,
                        background: 'linear-gradient(90deg, #f0eeea 25%, #e8e5e0 50%, #f0eeea 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.4s infinite',
                        borderRadius: 8,
                    }} />
                ) : !hasChartData ? (
                    /* Empty state */
                    <div style={{
                        height: 240,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', gap: 10,
                    }}>
                        <svg style={{ width: 36, height: 36, opacity: 0.25 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>No data available</p>
                        <p style={{ fontSize: '0.75rem' }}>Messages will appear here once conversations begin</p>
                    </div>
                ) : (
                    /* Chart */
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart
                            data={trend}
                            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.18} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0eeea"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="date"
                                tickFormatter={shortDate}
                                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="messages"
                                name="Messages"
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                fill="url(#grad)"
                                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                                activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
