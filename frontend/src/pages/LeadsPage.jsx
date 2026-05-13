import { useEffect, useState, useRef, useCallback } from 'react'
import { leadsApi, whatsappApi, orgApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Stage config ───────────────────────────────────────────────────── */
const STAGES = [
    { key: 'NEW',         label: 'New Lead',    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { key: 'CONTACTED',   label: 'Contacted',   color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { key: 'INTERESTED',  label: 'Interested',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    { key: 'CLOSED_WON',  label: 'Closed Won',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { key: 'CLOSED_LOST', label: 'Closed Lost', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
]

const TAG_COLORS = {
    hot:       { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    cold:      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    'follow-up': { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    vip:       { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(iso) {
    if (!iso) return ''
    const d = new Date(iso), now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function initials(name) {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, size = 34, color = '#2563eb' }) {
    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2']
    const c = colors[(name?.charCodeAt(0) || 0) % colors.length]
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: c, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.35, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
        }}>
            {initials(name)}
        </div>
    )
}

/* ── Lead Card ──────────────────────────────────────────────────────── */
function LeadCard({ lead, stage, onDragStart, onEdit }) {
    const [dragging, setDragging] = useState(false)
    const name = lead.contact?.name || lead.contact?.phone_number || 'Unknown'

    return (
        <div
            draggable
            onDragStart={e => { setDragging(true); onDragStart(e, lead.id, stage.key) }}
            onDragEnd={() => setDragging(false)}
            onClick={() => onEdit(lead)}
            style={{
                background: '#fff',
                border: '1px solid #e4e1db',
                borderRadius: 10,
                padding: '12px 13px',
                cursor: 'grab',
                opacity: dragging ? 0.4 : 1,
                transform: dragging ? 'rotate(2deg) scale(1.02)' : 'none',
                transition: 'box-shadow 0.15s, transform 0.1s, opacity 0.1s',
                boxShadow: dragging ? '0 12px 32px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                userSelect: 'none',
            }}
            onMouseEnter={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                <Avatar name={name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{lead.contact?.phone_number}</p>
                </div>
                {lead.estimated_value && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
                        ${Number(lead.estimated_value).toLocaleString()}
                    </span>
                )}
            </div>

            {/* Title / note */}
            {lead.title && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.title}
                </p>
            )}

            {/* Latest note preview */}
            {lead.notes?.length > 0 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: '#f9f8f6', borderRadius: 6, padding: '5px 8px', marginBottom: 8, lineHeight: 1.4 }}>
                    💬 {lead.notes[0].content.slice(0, 60)}{lead.notes[0].content.length > 60 ? '…' : ''}
                </p>
            )}

            {/* Tags */}
            {lead.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {lead.tags.map(tag => {
                        const tc = TAG_COLORS[tag] || { bg: '#f5f4f0', color: '#6b7280', border: '#e4e1db' }
                        return (
                            <span key={tag} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                                #{tag}
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.67rem', color: '#a1a1aa' }}>{timeAgo(lead.created_at)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {lead.source && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', background: '#f5f4f0', border: '1px solid #e4e1db', borderRadius: 5, color: '#6b7280' }}>
                            {lead.source}
                        </span>
                    )}
                    {lead.assigned_to_name && (
                        <span style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>→ {lead.assigned_to_name}</span>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ── Kanban Column ──────────────────────────────────────────────────── */
function KanbanColumn({ stage, leads, onDragStart, onDragOver, onDrop, onEdit, onAddDirect }) {
    const [isOver, setIsOver] = useState(false)

    return (
        <div style={{ width: 272, flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Column header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', marginBottom: 8, borderRadius: 10,
                background: stage.bg, border: `1px solid ${stage.border}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: stage.color }}>{stage.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', background: '#fff', border: `1px solid ${stage.border}`, borderRadius: 99, color: stage.color }}>
                        {leads.length}
                    </span>
                    <button
                        onClick={() => onAddDirect(stage.key)}
                        title={`Add to ${stage.label}`}
                        style={{ width: 20, height: 20, borderRadius: '50%', background: stage.color, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1 }}>
                        +
                    </button>
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setIsOver(true); onDragOver(e) }}
                onDragLeave={() => setIsOver(false)}
                onDrop={e => { setIsOver(false); onDrop(e, stage.key) }}
                style={{
                    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
                    padding: '6px 4px', borderRadius: 10, minHeight: 80,
                    background: isOver ? stage.bg : 'transparent',
                    border: isOver ? `2px dashed ${stage.color}` : '2px dashed transparent',
                    transition: 'background 0.15s, border-color 0.15s',
                }}
            >
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} stage={stage} onDragStart={onDragStart} onEdit={onEdit} />
                ))}
                {leads.length === 0 && !isOver && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#d1d5db', fontSize: '0.78rem' }}>
                        No leads here
                    </div>
                )}
                {isOver && (
                    <div style={{ height: 60, borderRadius: 8, border: `2px dashed ${stage.color}`, background: stage.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stage.color, fontSize: '0.78rem', fontWeight: 600 }}>
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}

/* ── Add / Edit Lead Modal ──────────────────────────────────────────── */
function LeadModal({ lead, defaultStage, onClose, onSaved, onDeleted }) {
    const isEdit = !!lead
    const [form, setForm] = useState({
        name: lead?.contact?.name || '',
        phone: lead?.contact?.phone_number || '',
        title: lead?.title || '',
        stage: lead?.stage || defaultStage || 'NEW',
        source: lead?.source || 'MANUAL',
        estimated_value: lead?.estimated_value || '',
        tags: lead?.tags?.join(', ') || '',
    })
    const [noteText, setNoteText] = useState('')
    const [notes, setNotes] = useState(lead?.notes || [])
    const [busy, setBusy] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [noteLoading, setNoteLoading] = useState(false)
    const [tab, setTab] = useState('details')

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const save = async () => {
        if (!form.name.trim() || !form.phone.trim()) { toast.error('Name and phone are required'); return }
        setBusy(true)
        try {
            if (isEdit) {
                // Update title, stage, value, tags via PATCH
                await leadsApi.update(lead.id, {
                    title: form.title,
                    stage: form.stage,
                    estimated_value: form.estimated_value || null,
                    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                })
                toast.success('Lead updated')
            } else {
                // 1. Create or find contact
                const { data: contact } = await whatsappApi.createContact({
                    name: form.name.trim(),
                    phone_number: form.phone.trim(),
                })
                // 2. Create lead
                await leadsApi.create({
                    contact_id: contact.id,
                    title: form.title,
                    stage: form.stage,
                    source: form.source,
                    estimated_value: form.estimated_value || null,
                    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                })
                toast.success('Lead created!')
            }
            onSaved()
        } catch (err) {
            const msg = err?.response?.data?.phone_number?.[0] || err?.response?.data?.detail || 'Failed to save lead'
            toast.error(msg)
        } finally { setBusy(false) }
    }

    const deleteLead = async () => {
        if (!window.confirm('Delete this lead? This cannot be undone.')) return
        setDeleting(true)
        try {
            await leadsApi.update(lead.id, {}) // use destroy
            // Actually delete
            const axios = (await import('../api')).default
            await axios.delete(`/leads/${lead.id}/`)
            toast.success('Lead deleted')
            onDeleted()
        } catch { toast.error('Delete failed') }
        finally { setDeleting(false) }
    }

    const addNote = async () => {
        if (!noteText.trim() || !lead) return
        setNoteLoading(true)
        try {
            const { data } = await leadsApi.addNote(lead.id, noteText.trim())
            setNotes(n => [data, ...n])
            setNoteText('')
            toast.success('Note added')
        } catch { toast.error('Failed to add note') }
        finally { setNoteLoading(false) }
    }

    const SOURCES = ['MANUAL', 'WHATSAPP', 'IMPORT', 'CAMPAIGN']
    const TAG_SUGGESTIONS = ['hot', 'cold', 'follow-up', 'vip']

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', animation: 'fade-up 0.2s ease both' }}>

                {/* Modal Header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{isEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
                        {isEdit && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{lead.contact?.name} · {lead.contact?.phone_number}</p>}
                    </div>
                    <button onClick={onClose} style={{ padding: 6, borderRadius: 7, border: 'none', background: '#f5f4f0', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                        <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs (edit only) */}
                {isEdit && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #e4e1db', padding: '0 20px' }}>
                        {['details', 'notes'].map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', color: tab === t ? '#2563eb' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent', textTransform: 'capitalize' }}>
                                {t}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                    {tab === 'details' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Name + Phone (only for new leads) */}
                            {!isEdit && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Full Name *</label>
                                        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rahul Sharma"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }}
                                            onFocus={e => e.target.style.borderColor = '#93c5fd'} onBlur={e => e.target.style.borderColor = '#e4e1db'} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Phone Number *</label>
                                        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210"
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }}
                                            onFocus={e => e.target.style.borderColor = '#93c5fd'} onBlur={e => e.target.style.borderColor = '#e4e1db'} />
                                    </div>
                                </>
                            )}

                            {/* Title / Note */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Title / Note</label>
                                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Interested in premium plan"
                                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }}
                                    onFocus={e => e.target.style.borderColor = '#93c5fd'} onBlur={e => e.target.style.borderColor = '#e4e1db'} />
                            </div>

                            {/* Stage */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Stage</label>
                                <select value={form.stage} onChange={e => set('stage', e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)', background: '#fff', cursor: 'pointer' }}>
                                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* Source + Value row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {!isEdit && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Source</label>
                                        <select value={form.source} onChange={e => set('source', e.target.value)}
                                            style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)', background: '#fff' }}>
                                            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div style={{ gridColumn: isEdit ? '1 / -1' : 'auto' }}>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Est. Value ($)</label>
                                    <input type="number" value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} placeholder="0"
                                        style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }}
                                        onFocus={e => e.target.style.borderColor = '#93c5fd'} onBlur={e => e.target.style.borderColor = '#e4e1db'} />
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Tags (comma-separated)</label>
                                <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="hot, follow-up, vip"
                                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.875rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }}
                                    onFocus={e => e.target.style.borderColor = '#93c5fd'} onBlur={e => e.target.style.borderColor = '#e4e1db'} />
                                <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                                    {TAG_SUGGESTIONS.map(t => {
                                        const tc = TAG_COLORS[t] || {}
                                        const active = form.tags.includes(t)
                                        return (
                                            <button key={t} type="button"
                                                onClick={() => {
                                                    const tags = form.tags ? form.tags.split(',').map(x => x.trim()).filter(Boolean) : []
                                                    const idx = tags.indexOf(t)
                                                    if (idx >= 0) tags.splice(idx, 1); else tags.push(t)
                                                    set('tags', tags.join(', '))
                                                }}
                                                style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font)', border: `1px solid ${active ? tc.border : '#e4e1db'}`, background: active ? tc.bg : '#f9f8f6', color: active ? tc.color : '#6b7280', fontWeight: active ? 700 : 400 }}>
                                                #{t}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Notes tab */
                        <div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note…"
                                    onKeyDown={e => e.key === 'Enter' && addNote()}
                                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)' }} />
                                <button onClick={addNote} disabled={noteLoading || !noteText.trim()}
                                    style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                    Add
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {notes.map(n => (
                                    <div key={n.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{n.content}</p>
                                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{n.author_name} · {timeAgo(n.created_at)}</p>
                                    </div>
                                ))}
                                {notes.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No notes yet</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    {isEdit ? (
                        <button onClick={deleteLead} disabled={deleting}
                            style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onClose}
                            style={{ padding: '8px 16px', background: '#f5f4f0', color: 'var(--text-secondary)', border: '1px solid #e4e1db', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'var(--font)' }}>
                            Cancel
                        </button>
                        <button onClick={save} disabled={busy}
                            style={{ padding: '8px 20px', background: busy ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {busy && <svg className="animate-spin" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.3 }} /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lead'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Main Leads Page ────────────────────────────────────────────────── */
export default function LeadsPage() {
    const { currentOrg } = useAuthStore()
    const [board, setBoard] = useState({})       // { STAGE_KEY: [leads] }
    const [counts, setCounts] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(null)      // null | { lead?, stage? }
    const dragRef = useRef({ leadId: null, fromStage: null })

    /* ── Load board ─────────────────────────────── */
    const loadBoard = useCallback(() => {
        if (!currentOrg) return
        leadsApi.kanban()
            .then(r => {
                const b = {}, c = {}
                r.data.forEach(col => { b[col.stage] = col.leads; c[col.stage] = col.count })
                setBoard(b)
                setCounts(c)
            })
            .finally(() => setLoading(false))
    }, [currentOrg])

    useEffect(() => { loadBoard() }, [loadBoard])

    /* ── Drag & Drop ─────────────────────────────── */
    const onDragStart = (e, leadId, fromStage) => {
        dragRef.current = { leadId, fromStage }
        e.dataTransfer.effectAllowed = 'move'
    }
    const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

    const onDrop = async (e, toStage) => {
        e.preventDefault()
        const { leadId, fromStage } = dragRef.current
        if (!leadId || fromStage === toStage) return

        // Optimistic UI update
        const lead = board[fromStage]?.find(l => l.id === leadId)
        if (!lead) return
        setBoard(b => ({
            ...b,
            [fromStage]: (b[fromStage] || []).filter(l => l.id !== leadId),
            [toStage]: [{ ...lead, stage: toStage }, ...(b[toStage] || [])],
        }))
        setCounts(c => ({ ...c, [fromStage]: (c[fromStage] || 1) - 1, [toStage]: (c[toStage] || 0) + 1 }))

        try {
            await leadsApi.move(leadId, toStage)
            toast.success(`Moved to ${STAGES.find(s => s.key === toStage)?.label}`)
        } catch {
            toast.error('Failed to move lead')
            loadBoard() // revert
        }
        dragRef.current = { leadId: null, fromStage: null }
    }

    /* ── Search filter ───────────────────────────── */
    const filterLeads = (leads) => {
        if (!search) return leads
        const q = search.toLowerCase()
        return leads.filter(l =>
            (l.contact?.name || '').toLowerCase().includes(q) ||
            (l.contact?.phone_number || '').toLowerCase().includes(q) ||
            (l.title || '').toLowerCase().includes(q) ||
            (l.tags || []).some(t => t.toLowerCase().includes(q))
        )
    }

    /* ── Total leads metric ──────────────────────── */
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const won = counts['CLOSED_WON'] || 0
    const wonValue = (board['CLOSED_WON'] || []).reduce((a, l) => a + Number(l.estimated_value || 0), 0)

    if (loading) return (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
            <svg className="animate-spin" style={{ width: 28, height: 28, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.2 }} />
                <path fill="currentColor" style={{ opacity: 0.8 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, background: 'var(--bg-page)' }}>

            {/* ── Top Bar ──────────────────────────────────── */}
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lead Pipeline</h1>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {total} leads total · {won} won{wonValue > 0 ? ` · $${wonValue.toLocaleString()} closed` : ''}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
                                style={{ padding: '7px 12px 7px 30px', fontSize: '0.82rem', border: '1px solid #e4e1db', borderRadius: 8, outline: 'none', fontFamily: 'var(--font)', width: 200, background: '#f9f8f6' }}
                                onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.background = '#fff' }}
                                onBlur={e => { e.target.style.borderColor = '#e4e1db'; e.target.style.background = '#f9f8f6' }} />
                        </div>

                        {/* Add Lead */}
                        <button onClick={() => setModal({ lead: null, stage: 'NEW' })}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                            <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                            Add Lead
                        </button>
                    </div>
                </div>

                {/* Stage overview pills */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'nowrap', overflowX: 'auto' }}>
                    {STAGES.map(s => (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: s.bg, border: `1px solid ${s.border}`, flexShrink: 0 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                            <span style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600 }}>{s.label}</span>
                            <span style={{ fontSize: '0.72rem', color: s.color, fontWeight: 800 }}>{counts[s.key] || 0}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Kanban Board ──────────────────────────────── */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 14 }}>
                {STAGES.map(stage => (
                    <KanbanColumn
                        key={stage.key}
                        stage={stage}
                        leads={filterLeads(board[stage.key] || [])}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onEdit={lead => setModal({ lead, stage: lead.stage })}
                        onAddDirect={stageKey => setModal({ lead: null, stage: stageKey })}
                    />
                ))}
            </div>

            {/* ── Modal ─────────────────────────────────────── */}
            {modal && (
                <LeadModal
                    lead={modal.lead}
                    defaultStage={modal.stage}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); loadBoard() }}
                    onDeleted={() => { setModal(null); loadBoard() }}
                />
            )}
        </div>
    )
}
