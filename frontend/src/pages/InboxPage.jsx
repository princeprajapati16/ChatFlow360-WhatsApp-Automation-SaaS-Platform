import { useEffect, useState, useRef, useCallback } from 'react'
import { convoApi, orgApi, whatsappApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Helpers ──────────────────────────────────────────────────────────── */
function timeAgo(iso) {
    if (!iso) return ''
    const d = new Date(iso), now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function initials(name) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_COLORS = {
    OPEN: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    ASSIGNED: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    RESOLVED: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    SNOOZED: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
}

/* ── Avatar ───────────────────────────────────────────────────────────── */
function Avatar({ name, size = 38 }) {
    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: size * 0.36,
            fontWeight: 700, color: '#fff', letterSpacing: '-0.03em',
        }}>
            {initials(name)}
        </div>
    )
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 14, r = 6, style = {} }) {
    return (
        <div style={{
            width: w, height: h, borderRadius: r,
            background: 'linear-gradient(90deg, #f0eeea 25%, #e8e5e0 50%, #f0eeea 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s ease infinite',
            ...style,
        }} />
    )
}

/* ── Conversation Item ────────────────────────────────────────────────── */
function ConvoItem({ conv, selected, onSelect }) {
    const isActive = selected?.id === conv.id
    const sc = STATUS_COLORS[conv.status] || STATUS_COLORS.OPEN
    return (
        <button
            onClick={() => onSelect(conv)}
            style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                borderBottom: '1px solid #f0eeea',
                background: isActive ? '#eff6ff' : 'transparent',
                borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer', border: 'none', fontFamily: 'var(--font)',
                transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9f8f6' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
        >
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ position: 'relative' }}>
                    <Avatar name={conv.contact_name || conv.contact_phone} size={40} />
                    {conv.unread_count > 0 && (
                        <span style={{
                            position: 'absolute', top: -2, right: -2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#2563eb', border: '2px solid #fff',
                            fontSize: 9, fontWeight: 800, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: conv.unread_count > 0 ? 700 : 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                            {conv.contact_name || conv.contact_phone}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 6 }}>
                            {timeAgo(conv.last_message_at)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.78rem', color: conv.unread_count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>
                            {conv.last_message ? (conv.last_message.direction === 'OUTBOUND' ? '↗ ' : '') + conv.last_message.content : 'No messages yet'}
                        </p>
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, flexShrink: 0, marginLeft: 4 }}>
                            {conv.status}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    )
}

/* ── Message Bubble ───────────────────────────────────────────────────── */
function Bubble({ msg }) {
    const isOut = msg.direction === 'OUTBOUND'
    const statusIcon = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '✗' }[msg.delivery_status] || '✓'
    const statusColor = msg.delivery_status === 'read' ? '#60a5fa' : msg.delivery_status === 'failed' ? '#ef4444' : 'rgba(255,255,255,0.6)'
    return (
        <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
            <div style={{
                maxWidth: '68%', padding: '9px 13px',
                borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isOut ? '#2563eb' : '#fff',
                border: isOut ? 'none' : '1px solid #e4e1db',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                color: isOut ? '#fff' : 'var(--text-primary)',
            }}>
                {!isOut && msg.sender_name && (
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#7c3aed', marginBottom: 3 }}>{msg.sender_name}</p>
                )}
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>{fmtTime(msg.created_at)}</span>
                    {isOut && <span style={{ fontSize: '0.7rem', color: statusColor }}>{statusIcon}</span>}
                </div>
            </div>
        </div>
    )
}

/* ── Date Separator ───────────────────────────────────────────────────── */
function DateSep({ date }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e4e1db' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 10px', background: '#f5f4f0', borderRadius: 99, border: '1px solid #e4e1db' }}>{date}</span>
            <div style={{ flex: 1, height: 1, background: '#e4e1db' }} />
        </div>
    )
}

/* ── Typing Indicator ─────────────────────────────────────────────────── */
function TypingDots() {
    return (
        <div style={{ display: 'flex', gap: 4, padding: '8px 14px', background: '#fff', border: '1px solid #e4e1db', borderRadius: '18px 18px 18px 4px', width: 'fit-content', marginBottom: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a1a1aa', display: 'block' }} />
            ))}
        </div>
    )
}

/* ── Empty Chat ───────────────────────────────────────────────────────── */
function EmptyChat() {
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#f9f8f6' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 32, height: 32, color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select a conversation</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>Choose a chat from the left to start messaging</p>
            </div>
        </div>
    )
}

/* ── Main Inbox ───────────────────────────────────────────────────────── */
const TABS = ['OPEN', 'ASSIGNED', 'RESOLVED']

export default function InboxPage() {
    const { currentOrg, user } = useAuthStore()
    const [convos, setConvos] = useState([])
    const [selected, setSelected] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [tab, setTab] = useState('OPEN')
    const [search, setSearch] = useState('')
    const [sending, setSending] = useState(false)
    const [loadingConvos, setLoadingConvos] = useState(true)
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [notes, setNotes] = useState([])
    const [noteInput, setNoteInput] = useState('')
    const [agents, setAgents] = useState([])
    const [assignOpen, setAssignOpen] = useState(false)
    const [waStatus, setWaStatus] = useState(null)
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)
    const pollMsgRef = useRef(null)
    const pollConvoRef = useRef(null)

    /* ── Load conversations ─────────────────────────── */
    const loadConvos = useCallback(() => {
        if (!currentOrg) return
        convoApi.list({ status: tab, search: search || undefined })
            .then(r => { setConvos(r.data.results || r.data); setLoadingConvos(false) })
            .catch(() => setLoadingConvos(false))
    }, [currentOrg, tab, search])

    useEffect(() => { setLoadingConvos(true); loadConvos() }, [loadConvos])

    useEffect(() => {
        pollConvoRef.current = setInterval(loadConvos, 8000)
        return () => clearInterval(pollConvoRef.current)
    }, [loadConvos])

    /* ── Load messages ──────────────────────────────── */
    const loadMessages = useCallback(() => {
        if (!selected) return
        convoApi.messages(selected.id)
            .then(r => setMessages(r.data.results || r.data))
            .catch(() => { })
    }, [selected])

    useEffect(() => {
        if (!selected) { setMessages([]); setNotes([]); return }
        setLoadingMsgs(true)
        convoApi.messages(selected.id)
            .then(r => setMessages(r.data.results || r.data))
            .catch(() => { })
            .finally(() => setLoadingMsgs(false))
        convoApi.markRead(selected.id).catch(() => { })
        convoApi.notes(selected.id).then(r => setNotes(r.data.results || r.data)).catch(() => { })
        inputRef.current?.focus()
    }, [selected])

    useEffect(() => {
        clearInterval(pollMsgRef.current)
        if (!selected) return
        pollMsgRef.current = setInterval(loadMessages, 3000)
        return () => clearInterval(pollMsgRef.current)
    }, [loadMessages, selected])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!currentOrg) return
        orgApi.members(currentOrg.id).then(r => setAgents(r.data.results || r.data)).catch(() => { })
    }, [currentOrg])

    useEffect(() => {
        if (!currentOrg) return
        whatsappApi.getStatus()
            .then(r => setWaStatus(r.data))
            .catch(() => setWaStatus({ connected: false }))
    }, [currentOrg])

    /* ── Send message ────────────────────────────────── */
    const send = async (e) => {
        e.preventDefault()
        if (!input.trim() || !selected || sending) return
        const text = input.trim()
        setInput('')
        setSending(true)
        const optimistic = { id: `opt-${Date.now()}`, direction: 'OUTBOUND', content: text, created_at: new Date().toISOString(), delivery_status: 'sent' }
        setMessages(m => [...m, optimistic])
        try {
            const { data: msg } = await convoApi.sendMessage(selected.id, text)
            setMessages(m => m.map(x => x.id === optimistic.id ? msg : x))
            setConvos(cs => cs.map(c => c.id === selected.id ? { ...c, last_message: { content: text, direction: 'OUTBOUND' }, last_message_at: msg.created_at } : c))
        } catch {
            toast.error('Failed to send message')
            setMessages(m => m.filter(x => x.id !== optimistic.id))
            setInput(text)
        } finally { setSending(false) }
    }

    const resolve = async () => {
        await convoApi.resolve(selected.id)
        toast.success('Conversation resolved ✓')
        setSelected(null)
        setConvos(cs => cs.filter(c => c.id !== selected.id))
    }
    const reopen = async () => {
        await convoApi.reopen(selected.id)
        toast.success('Conversation reopened')
        setSelected(s => ({ ...s, status: 'OPEN' }))
        setConvos(cs => cs.map(c => c.id === selected.id ? { ...c, status: 'OPEN' } : c))
    }

    const assign = async (agentId) => {
        setAssignOpen(false)
        const { data } = await convoApi.assign(selected.id, agentId)
        setSelected(s => ({ ...s, ...data }))
        setConvos(cs => cs.map(c => c.id === selected.id ? { ...c, ...data } : c))
        toast.success('Conversation assigned')
    }

    const addNote = async () => {
        if (!noteInput.trim()) return
        const { data } = await convoApi.addNote(selected.id, noteInput.trim())
        setNotes(n => [...n, data])
        setNoteInput('')
        toast.success('Note added')
    }

    const grouped = messages.reduce((acc, msg) => {
        const day = msg.created_at ? new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'
        if (!acc.length || acc[acc.length - 1].day !== day) acc.push({ day, msgs: [msg] })
        else acc[acc.length - 1].msgs.push(msg)
        return acc
    }, [])

    const filtered = convos.filter(c =>
        !search || (c.contact_name || c.contact_phone || '').toLowerCase().includes(search.toLowerCase())
    )

    const sc = selected ? STATUS_COLORS[selected.status] || STATUS_COLORS.OPEN : null

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f5f4f0', overflow: 'hidden' }}>

            {/* ══ LEFT: Conversation List ══════════════════════ */}
            <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #e4e1db', flexShrink: 0, height: '100vh' }}>

                <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #e4e1db' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Inbox</h1>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 99, fontWeight: 600 }}>
                            {filtered.length} chats
                        </span>
                    </div>

                    {/* WhatsApp connection status chip */}
                    {waStatus !== null && (
                        waStatus.connected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, marginBottom: 10 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    WA: {waStatus.display_phone_number || waStatus.display_name || 'Connected'}
                                </span>
                            </div>
                        ) : (
                            <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, marginBottom: 10, textDecoration: 'none' }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Connect WhatsApp to receive messages →</span>
                            </a>
                        )
                    )}

                    {/* Search */}
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                        <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search conversations…"
                            style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '0.82rem', background: '#f5f4f0', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 2, marginBottom: -1 }}>
                        {TABS.map(t => (
                            <button key={t} onClick={() => { setTab(t); setSelected(null) }}
                                style={{
                                    flex: 1, padding: '7px 4px', fontSize: '0.75rem', fontWeight: 600,
                                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                                    color: tab === t ? '#2563eb' : 'var(--text-muted)',
                                    borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                                    transition: 'all 0.15s',
                                }}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {loadingConvos ? (
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10 }}>
                                    <Skeleton w={40} h={40} r={20} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <Skeleton w="60%" h={12} />
                                        <Skeleton w="90%" h={10} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <svg style={{ width: 36, height: 36, color: '#d1d5db', margin: '0 auto 10px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No {tab.toLowerCase()} conversations</p>
                        </div>
                    ) : filtered.map(c => (
                        <ConvoItem key={c.id} conv={c} selected={selected} onSelect={c => { setSelected(c); setShowInfo(false) }} />
                    ))}
                </div>
            </div>

            {/* ══ CENTER: Chat Window ══════════════════════════ */}
            {selected ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f9f8f6', height: '100vh', overflow: 'hidden' }}>

                    {/* Chat Header */}
                    <div style={{ padding: '12px 18px', background: '#fff', borderBottom: '1px solid #e4e1db', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <Avatar name={selected.contact_name || selected.contact_phone} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selected.contact_name || selected.contact_phone}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {selected.contact_phone}
                                {selected.assigned_to_name && <span> · Assigned to <b style={{ color: 'var(--text-secondary)' }}>{selected.assigned_to_name}</b></span>}
                            </p>
                        </div>

                        <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontWeight: 600 }}>
                            {selected.status}
                        </span>

                        {/* Assign dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setAssignOpen(o => !o)}
                                style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 500, background: '#f5f4f0', border: '1px solid #e4e1db', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Assign
                            </button>
                            {assignOpen && (
                                <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e4e1db', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 180, overflow: 'hidden' }}>
                                    {agents.map(a => (
                                        <button key={a.user?.id || a.id} onClick={() => assign(a.user?.id || a.id)}
                                            style={{ width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.82rem', color: 'var(--text-primary)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            {a.user?.first_name || a.first_name || a.user?.email}
                                        </button>
                                    ))}
                                    {agents.length === 0 && <p style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No agents found</p>}
                                </div>
                            )}
                        </div>

                        {/* Resolve / Reopen */}
                        {selected.status !== 'RESOLVED' ? (
                            <button onClick={resolve}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Resolve
                            </button>
                        ) : (
                            <button onClick={reopen}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Reopen
                            </button>
                        )}

                        <button onClick={() => setShowInfo(o => !o)}
                            style={{ padding: '6px', background: showInfo ? '#eff6ff' : 'none', border: showInfo ? '1px solid #bfdbfe' : '1px solid transparent', borderRadius: 7, cursor: 'pointer', color: showInfo ? '#2563eb' : 'var(--text-muted)', display: 'flex' }}>
                            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        onClick={() => setAssignOpen(false)}>
                        {loadingMsgs ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                                        <Skeleton w={`${40 + Math.random() * 30}%`} h={42} r={14} />
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', marginTop: 40 }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No messages yet — say hello! 👋</p>
                            </div>
                        ) : (
                            grouped.map(group => (
                                <div key={group.day}>
                                    <DateSep date={group.day} />
                                    {group.msgs.map(msg => <Bubble key={msg.id} msg={msg} />)}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ background: '#fff', borderTop: '1px solid #e4e1db', padding: '12px 16px', flexShrink: 0 }}>
                        {selected.status === 'RESOLVED' ? (
                            <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                This conversation is resolved. <button onClick={reopen} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.82rem', fontWeight: 600 }}>Reopen</button> to reply.
                            </div>
                        ) : (
                            <form onSubmit={send} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
                                    placeholder="Type a message… (Enter to send)"
                                    rows={1}
                                    style={{
                                        flex: 1, resize: 'none', padding: '10px 14px', fontSize: '0.875rem',
                                        border: '1px solid #e4e1db', borderRadius: 12, outline: 'none',
                                        fontFamily: 'var(--font)', color: 'var(--text-primary)',
                                        background: '#f9f8f6', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                                        transition: 'border-color 0.15s, box-shadow 0.15s',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#e4e1db'; e.target.style.boxShadow = 'none' }}
                                />
                                <button type="submit" disabled={sending || !input.trim()}
                                    style={{
                                        width: 42, height: 42, borderRadius: '50%', border: 'none',
                                        background: input.trim() ? '#2563eb' : '#e4e1db',
                                        color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, transition: 'background 0.15s',
                                    }}>
                                    {sending
                                        ? <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.3 }} /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    }
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            ) : (
                <EmptyChat />
            )}

            {/* ══ RIGHT: Info Panel ══════════════════════════*/}
            {selected && showInfo && (
                <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #e4e1db', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e4e1db', textAlign: 'center' }}>
                        <Avatar name={selected.contact_name || selected.contact_phone} size={52} />
                        <p style={{ fontWeight: 700, marginTop: 10, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selected.contact_name || 'Unknown'}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{selected.contact_phone}</p>
                        {selected.tags?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                                {selected.tags.map(t => <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#f5f4f0', border: '1px solid #e4e1db', borderRadius: 99, color: 'var(--text-secondary)' }}>#{t}</span>)}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e1db' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Details</p>
                        {[
                            ['Status', selected.status],
                            ['Assigned to', selected.assigned_to_name || 'Unassigned'],
                            ['Via WhatsApp', selected.whatsapp_account_name || '—'],
                            ['Opened', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'],
                            ['Messages', messages.length],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '14px 16px', flex: 1 }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Internal Notes</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {notes.map(n => (
                                <div key={n.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{n.content}</p>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{n.author_name} · {timeAgo(n.created_at)}</p>
                                </div>
                            ))}
                            {notes.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No notes yet</p>}
                        </div>
                        <textarea
                            value={noteInput} onChange={e => setNoteInput(e.target.value)}
                            placeholder="Add internal note…"
                            rows={3}
                            style={{ width: '100%', resize: 'none', padding: '8px 10px', fontSize: '0.8rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)', marginBottom: 8, background: '#f9f8f6' }}
                        />
                        <button onClick={addNote} disabled={!noteInput.trim()}
                            style={{ width: '100%', padding: '7px', fontSize: '0.8rem', fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Add Note
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            `}</style>
        </div>
    )
}
