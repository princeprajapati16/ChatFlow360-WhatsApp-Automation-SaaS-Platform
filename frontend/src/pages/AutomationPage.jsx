import { useEffect, useState, useCallback } from 'react'
import { whatsappApi } from '../api'
import { automationApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Shared UI ─────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 14, r = 6, style = {} }) {
    return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f0eeea 25%,#e8e5e0 50%,#f0eeea 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite', ...style }} />
}
function Spinner({ size = 15 }) {
    return <svg className="animate-spin" style={{ width: size, height: size }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
}
function Toggle({ value, onChange, disabled }) {
    return (
        <button onClick={onChange} disabled={disabled} title={value ? 'Active — click to disable' : 'Inactive — click to enable'}
            style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: value ? '#2563eb' : '#e4e1db', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.25s', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}>
            <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </button>
    )
}

const MATCH_LABELS = { contains: 'Contains', exact: 'Exact', starts_with: 'Starts With' }
const MATCH_COLORS = {
    contains: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    exact: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    starts_with: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
}

const SUGGESTIONS = [
    { keyword: 'hello', reply: 'Hi! Welcome to our store. How can we help you? 😊' },
    { keyword: 'price', reply: 'Our pricing starts at ₹999/mo. Visit our website for details!' },
    { keyword: 'order', reply: 'Please share your order ID and we\'ll check status right away.' },
    { keyword: 'demo', reply: 'Book a free demo: calendly.com/chatflow360 🎯' },
    { keyword: 'hours', reply: 'We\'re open Mon–Sat, 10AM to 7PM IST. 🕐' },
]

const DEFAULT_FORM = { name: '', keyword: '', match_type: 'contains', reply_text: '', is_active: true }

/* ── Activity Log Item ─────────────────────────────────────────────── */
function ActivityItem({ item }) {
    const t = new Date(item.triggered_at)
    const timeAgo = (() => {
        const diff = (Date.now() - t) / 1000
        if (diff < 60) return 'just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    })()
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid #f0eeea' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Rule <span style={{ color: '#2563eb' }}>"{item.rule_name}"</span> triggered
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Keyword matched: <strong>"{item.keyword_matched}"</strong>
                </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700 }}>replied</span>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{timeAgo}</p>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════════════
   AUTOMATION PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AutomationPage() {
    const { currentOrg } = useAuthStore()
    const [activeTab, setActiveTab] = useState('auto-replies')

    // Auto-reply rules state
    const [rules, setRules] = useState([])
    const [rulesLoading, setRulesLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)   // rule being edited (or null for create)
    const [form, setForm] = useState(DEFAULT_FORM)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [togglingId, setTogglingId] = useState(null)
    const [search, setSearch] = useState('')

    // Automation flows (existing)
    const [flows, setFlows] = useState([])
    const [flowsLoading, setFlowsLoading] = useState(false)

    // Activity log
    const [activity, setActivity] = useState([])
    const [activityLoading, setActivityLoading] = useState(false)

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const loadRules = useCallback(() => {
        setRulesLoading(true)
        whatsappApi.autoReplies()
            .then(r => setRules(r.data.results || r.data || []))
            .catch(() => setRules([]))
            .finally(() => setRulesLoading(false))
    }, [])

    const loadFlows = useCallback(() => {
        setFlowsLoading(true)
        automationApi.flows()
            .then(r => setFlows(r.data.results || r.data || []))
            .catch(() => setFlows([]))
            .finally(() => setFlowsLoading(false))
    }, [])

    const loadActivity = useCallback(() => {
        setActivityLoading(true)
        automationApi.activity()
            .then(r => setActivity(r.data.results || r.data || []))
            .catch(() => setActivity([]))
            .finally(() => setActivityLoading(false))
    }, [])

    useEffect(() => { loadRules() }, [loadRules])
    useEffect(() => {
        if (activeTab === 'flows') loadFlows()
        if (activeTab === 'activity') loadActivity()
    }, [activeTab, loadFlows, loadActivity])

    const openCreate = () => {
        setEditing(null)
        setForm(DEFAULT_FORM)
        setShowModal(true)
    }
    const openEdit = (rule) => {
        setEditing(rule)
        setForm({
            name: rule.name,
            keyword: rule.keywords?.[0] || '',
            match_type: rule.match_type,
            reply_text: rule.reply_text,
            is_active: rule.is_active,
        })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.keyword.trim() || !form.reply_text.trim()) {
            toast.error('Keyword and Reply Message are required')
            return
        }
        setSaving(true)
        const payload = {
            name: form.name || `Auto-reply: ${form.keyword}`,
            keyword: form.keyword.trim().toLowerCase(),
            keywords: [form.keyword.trim().toLowerCase()],
            match_type: form.match_type,
            reply_text: form.reply_text.trim(),
            is_active: form.is_active,
        }
        try {
            if (editing) {
                await whatsappApi.updateAutoReply(editing.id, payload)
                toast.success('Rule updated!')
            } else {
                await whatsappApi.createAutoReply(payload)
                toast.success('Auto-reply rule created!')
            }
            setShowModal(false)
            loadRules()
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to save rule')
        } finally { setSaving(false) }
    }

    const handleToggle = async (rule) => {
        setTogglingId(rule.id)
        try {
            await whatsappApi.toggleAutoReply(rule.id)
            setRules(rs => rs.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
        } catch { toast.error('Failed to toggle') } finally { setTogglingId(null) }
    }

    const handleDelete = async (rule) => {
        if (!confirm(`Delete auto-reply "${rule.name}"?`)) return
        setDeletingId(rule.id)
        try {
            await whatsappApi.deleteAutoReply(rule.id)
            toast.success('Deleted')
            setRules(rs => rs.filter(r => r.id !== rule.id))
        } catch { toast.error('Failed to delete') } finally { setDeletingId(null) }
    }

    const applySuggestion = (sug) => {
        setForm(f => ({ ...f, keyword: sug.keyword, reply_text: sug.reply, name: `Auto-reply: ${sug.keyword}` }))
    }

    const filteredRules = rules.filter(r =>
        !search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
        (r.keywords || []).some(k => k.toLowerCase().includes(search.toLowerCase())) ||
        r.reply_text?.toLowerCase().includes(search.toLowerCase())
    )

    const activeCount = rules.filter(r => r.is_active).length

    const SECTION_TABS = [
        { key: 'auto-replies', label: 'Auto-Reply Rules', icon: '🤖' },
        { key: 'flows', label: 'Chatbot Flows', icon: '🔀' },
        { key: 'activity', label: 'Activity Log', icon: '📋' },
    ]

    return (
        <div style={{ padding: 28, maxWidth: 900 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Automation</h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>Auto-reply rules, chatbot flows and activity logs</p>
                </div>
                {activeTab === 'auto-replies' && (
                    <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>+</span> Add Rule
                    </button>
                )}
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Rules', value: rules.length, icon: '📋', color: '#2563eb', bg: '#eff6ff' },
                    { label: 'Active Rules', value: activeCount, icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Inactive', value: rules.length - activeCount, icon: '⏸', color: '#d97706', bg: '#fffbeb' },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: 140, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f5f4f0', borderRadius: 10, padding: 4 }}>
                {SECTION_TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font)', fontSize: '0.82rem', fontWeight: activeTab === t.key ? 700 : 500,
                            background: activeTab === t.key ? '#fff' : 'transparent',
                            color: activeTab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                            boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* ── AUTO-REPLIES TAB ─────────────────────────────── */}
            {activeTab === 'auto-replies' && (
                <div>
                    {/* Search bar */}
                    {rules.length > 0 && (
                        <div style={{ marginBottom: 16, position: 'relative' }}>
                            <input
                                value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search rules by keyword or reply text…"
                                style={{ width: '100%', padding: '9px 14px 9px 38px', fontSize: '0.85rem', border: '1.5px solid #e4e1db', borderRadius: 10, outline: 'none', fontFamily: 'var(--font)', background: '#fff' }}
                                onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                                onBlur={e => { e.target.style.borderColor = '#e4e1db'; e.target.style.boxShadow = 'none' }}
                            />
                            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>✕</button>}
                        </div>
                    )}

                    {rulesLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[...Array(3)].map((_, i) => <Skeleton key={i} h={90} r={12} />)}
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div style={{ background: '#fff', border: '2px dashed #e4e1db', borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, border: '2px dashed #e4e1db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.6rem' }}>🤖</div>
                            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontSize: '1rem' }}>
                                {search ? 'No rules match your search' : 'No auto-reply rules yet'}
                            </p>
                            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 20px' }}>
                                {search ? 'Try a different keyword.' : 'Create keyword-triggered auto-replies. When a customer sends a matching message, ChatFlow360 replies instantly.'}
                            </p>
                            {!search && (
                                <>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Quick start suggestions:</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                        {SUGGESTIONS.map(s => (
                                            <button key={s.keyword} onClick={() => { applySuggestion(s); setShowModal(true) }}
                                                style={{ padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff' }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb' }}>
                                                "{s.keyword}"
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {filteredRules.map(rule => {
                                const mc = MATCH_COLORS[rule.match_type] || MATCH_COLORS.contains
                                const keywords = rule.keywords || []
                                return (
                                    <div key={rule.id}
                                        style={{ background: '#fff', border: `1.5px solid ${rule.is_active ? '#e4e1db' : '#f0eeea'}`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)', opacity: rule.is_active ? 1 : 0.7, transition: 'all 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>

                                        {/* Icon */}
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: rule.is_active ? '#eff6ff' : '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                            🤖
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{rule.name}</p>
                                                <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 99, background: mc.bg, color: mc.text, border: `1px solid ${mc.border}`, fontWeight: 700 }}>
                                                    {MATCH_LABELS[rule.match_type]}
                                                </span>
                                            </div>

                                            {/* Keywords */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>triggers on:</span>
                                                {keywords.map(kw => (
                                                    <span key={kw} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, background: '#f5f4f0', color: 'var(--text-secondary)', border: '1px solid #e4e1db', fontFamily: 'monospace', fontWeight: 600 }}>
                                                        "{kw}"
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Reply preview */}
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px' }}>
                                                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a', marginBottom: 3 }}>💬 Auto-reply:</p>
                                                <p style={{ fontSize: '0.78rem', color: '#15803d', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                    {rule.reply_text?.slice(0, 120)}{rule.reply_text?.length > 120 ? '…' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                                            <Toggle
                                                value={rule.is_active}
                                                onChange={() => handleToggle(rule)}
                                                disabled={togglingId === rule.id}
                                            />
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => openEdit(rule)}
                                                    style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(rule)} disabled={deletingId === rule.id}
                                                    style={{ padding: '4px 10px', fontSize: '0.72rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                                    {deletingId === rule.id ? <Spinner size={11} /> : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── FLOWS TAB ──────────────────────────────────────── */}
            {activeTab === 'flows' && (
                <div>
                    {flowsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...Array(3)].map((_, i) => <Skeleton key={i} h={80} r={12} />)}
                        </div>
                    ) : flows.length === 0 ? (
                        <div style={{ background: '#fff', border: '2px dashed #e4e1db', borderRadius: 16, padding: '48px', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', marginBottom: 12 }}>🔀</p>
                            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No chatbot flows yet</p>
                            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>Multi-step conversation flows coming soon.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {flows.map(flow => (
                                <div key={flow.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🔀</div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{flow.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trigger: "<code>{flow.trigger_keyword}</code>"</p>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: flow.is_active ? '#f0fdf4' : '#fef2f2', color: flow.is_active ? '#16a34a' : '#dc2626', border: `1px solid ${flow.is_active ? '#bbf7d0' : '#fecaca'}`, fontWeight: 700 }}>
                                        {flow.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── ACTIVITY TAB ───────────────────────────────────── */}
            {activeTab === 'activity' && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Auto-Reply Activity</p>
                        <button onClick={loadActivity} style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>↺ Refresh</button>
                    </div>
                    {activityLoading ? (
                        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...Array(5)].map((_, i) => <Skeleton key={i} h={52} r={8} />)}
                        </div>
                    ) : activity.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', marginBottom: 10 }}>📋</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No activity yet. Auto-replies will appear here once triggered.</p>
                        </div>
                    ) : (
                        activity.map((item, i) => <ActivityItem key={i} item={item} />)
                    )}
                </div>
            )}

            {/* ── CREATE / EDIT RULE MODAL ──────────────────────── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <div>
                                <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                    {editing ? 'Edit Auto-Reply Rule' : 'Create Auto-Reply Rule'}
                                </h2>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                    {editing ? 'Update rule settings' : 'When keyword matches → send instant reply'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.3rem', lineHeight: 1 }}>✕</button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                                {/* Quick suggestions (create only) */}
                                {!editing && (
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Quick fill suggestions:</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {SUGGESTIONS.map(s => (
                                                <button key={s.keyword} type="button" onClick={() => applySuggestion(s)}
                                                    style={{ padding: '4px 12px', background: form.keyword === s.keyword ? '#2563eb' : '#f5f4f0', color: form.keyword === s.keyword ? '#fff' : 'var(--text-secondary)', border: '1px solid #e4e1db', borderRadius: 16, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                                                    {s.keyword}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rule name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Rule Name</label>
                                    <input className="input" value={form.name} onChange={e => setF('name', e.target.value)} placeholder={form.keyword ? `Auto-reply: ${form.keyword}` : 'e.g. Greeting Reply'} />
                                </div>

                                {/* Keyword + match type row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                                            Trigger Keyword <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input className="input" value={form.keyword} onChange={e => setF('keyword', e.target.value)} placeholder='e.g. "hello", "price", "demo"' required autoFocus={!editing} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Match Type</label>
                                        <select className="input" value={form.match_type} onChange={e => setF('match_type', e.target.value)}>
                                            <option value="contains">Contains</option>
                                            <option value="exact">Exact Match</option>
                                            <option value="starts_with">Starts With</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Match type explanation */}
                                <div style={{ background: '#f9f8f6', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                                    {form.match_type === 'contains' && <><strong>Contains:</strong> Matches if message includes the keyword anywhere. E.g. "Hi, what's the price?" triggers "price".</>}
                                    {form.match_type === 'exact' && <><strong>Exact:</strong> Message must be exactly the keyword. E.g. only "hello" triggers (not "hello world").</>}
                                    {form.match_type === 'starts_with' && <><strong>Starts With:</strong> Message must begin with the keyword. E.g. "price list" triggers "price".</>}
                                </div>

                                {/* Reply text */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                                        Reply Message <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <textarea className="input" value={form.reply_text} onChange={e => setF('reply_text', e.target.value)} placeholder="Hi! Welcome to our store. How can we help you? 😊" rows={5} required
                                        style={{ resize: 'vertical', minHeight: 100, fontFamily: 'var(--font)', lineHeight: 1.6 }} />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        Supports emojis. {form.reply_text.length}/1024 characters.
                                    </p>
                                </div>

                                {/* Active toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: form.is_active ? '#f0fdf4' : '#f9f8f6', border: `1px solid ${form.is_active ? '#bbf7d0' : '#e4e1db'}`, borderRadius: 8, transition: 'all 0.2s' }}>
                                    <Toggle value={form.is_active} onChange={() => setF('is_active', !form.is_active)} />
                                    <div>
                                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {form.is_active ? 'Rule Active — will auto-reply on match' : 'Rule Inactive — no auto-replies sent'}
                                        </p>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>You can toggle this later from the rule card.</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                                    {saving ? <><Spinner /> Saving…</> : editing ? '✓ Update Rule' : '🤖 Create Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
    )
}
