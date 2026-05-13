import { useEffect, useState, useCallback } from 'react'
import { campaignsApi, whatsappApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Status config ──────────────────────────────────────────────────── */
const STATUS_CFG = {
    DRAFT:     { label: 'Draft',     bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', dot: '#9ca3af' },
    SCHEDULED: { label: 'Scheduled', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: '#2563eb' },
    RUNNING:   { label: 'Running',   bg: '#fffbeb', color: '#d97706', border: '#fde68a', dot: '#f59e0b' },
    PAUSED:    { label: 'Paused',    bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', dot: '#7c3aed' },
    COMPLETED: { label: 'Completed', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#16a34a' },
    FAILED:    { label: 'Failed',    bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#dc2626' },
}

const MSG_TYPES  = ['TEXT', 'TEMPLATE', 'IMAGE']
const EMOJI_LIST = ['👋', '🎉', '🔥', '💬', '📢', '✅', '❤️', '🚀', '⭐', '🎁', '💡', '📱']

/* ── Helpers ────────────────────────────────────────────────────────── */
function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' })
}
function fmtDatetime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}
function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0 }

/* ── Stat mini bar ──────────────────────────────────────────────────── */
function MiniBar({ value, max, color }) {
    const w = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, height: 5, background: '#f0eeea', borderRadius: 99, overflow: 'hidden', maxWidth: 80 }}>
                <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color, minWidth: 28 }}>{w}%</span>
        </div>
    )
}

/* ── Stat Card ──────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color = '#2563eb', icon }) {
    return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>{icon}</div>
            <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em', marginTop: 2 }}>{value ?? '—'}</p>
                {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>}
            </div>
        </div>
    )
}

/* ── Campaign Detail Drawer ───────────────────────────────────────────── */
function CampaignDetail({ campaign, onClose, onLaunch, onPause, onDelete, onDuplicate }) {
    const sc = STATUS_CFG[campaign.status] || STATUS_CFG.DRAFT
    const contactsPerc = pct(campaign.sent_count, campaign.total_recipients)
    const deliveryPerc = pct(campaign.delivered_count, campaign.sent_count)
    const readPerc     = pct(campaign.read_count, campaign.delivered_count)
    const replyPerc    = pct(campaign.replied_count, campaign.delivered_count)

    const exportCSV = () => {
        const rows = [
            ['Metric', 'Count', 'Rate'],
            ['Recipients', campaign.total_recipients, '100%'],
            ['Sent', campaign.sent_count, contactsPerc + '%'],
            ['Delivered', campaign.delivered_count, deliveryPerc + '%'],
            ['Read', campaign.read_count, readPerc + '%'],
            ['Replies', campaign.replied_count, replyPerc + '%'],
            ['Failed', campaign.failed_count, ''],
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${campaign.name}-report.csv`; a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV exported')
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{ width: '100%', maxWidth: 520, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'fade-up 0.22s ease both' }}>

                {/* Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #e4e1db', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{campaign.name}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width:6, height:6, borderRadius:'50%', background: sc.dot }} />
                                {sc.label}
                            </span>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: '#f5f4f0', color: '#6b7280', border: '1px solid #e4e1db' }}>{campaign.message_type}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: 6, borderRadius: 7, border: 'none', background: '#f5f4f0', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                        <svg style={{ width:16, height:16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {campaign.status === 'DRAFT' && (
                            <button onClick={() => { onLaunch(campaign.id); onClose() }}
                                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'var(--font)' }}>
                                🚀 Launch Now
                            </button>
                        )}
                        {campaign.status === 'RUNNING' && (
                            <button onClick={() => { onPause(campaign.id); onClose() }}
                                style={{ padding:'7px 14px', background:'#f5f3ff', color:'#7c3aed', border:'1px solid #ddd6fe', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'var(--font)' }}>
                                ⏸ Pause
                            </button>
                        )}
                        <button onClick={() => { onDuplicate(campaign); onClose() }}
                            style={{ padding:'7px 14px', background:'#f5f4f0', color:'var(--text-secondary)', border:'1px solid #e4e1db', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:500, fontFamily:'var(--font)' }}>
                            ⧉ Duplicate
                        </button>
                        <button onClick={exportCSV}
                            style={{ padding:'7px 14px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:500, fontFamily:'var(--font)' }}>
                            ↓ Export CSV
                        </button>
                        <button onClick={() => { onDelete(campaign.id); onClose() }}
                            style={{ padding:'7px 14px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:500, fontFamily:'var(--font)', marginLeft:'auto' }}>
                            🗑 Delete
                        </button>
                    </div>

                    {/* Analytics Grid */}
                    <div style={{ background:'#f9f8f6', border:'1px solid #e4e1db', borderRadius:10, padding:'14px 16px' }}>
                        <p style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:12 }}>Campaign Analytics</p>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            {[
                                { label:'Recipients', val: campaign.total_recipients, color:'#2563eb', bar: false },
                                { label:'Sent', val: campaign.sent_count, pctVal: contactsPerc, color:'#7c3aed', bar: true },
                                { label:'Delivered', val: campaign.delivered_count, pctVal: deliveryPerc, color:'#16a34a', bar: true },
                                { label:'Read', val: campaign.read_count, pctVal: readPerc, color:'#d97706', bar: true },
                                { label:'Replies', val: campaign.replied_count, pctVal: replyPerc, color:'#0891b2', bar: true },
                                { label:'Failed', val: campaign.failed_count, color:'#dc2626', bar: false },
                            ].map(m => (
                                <div key={m.label} style={{ background:'#fff', borderRadius:8, padding:'10px 12px', border:'1px solid #e4e1db' }}>
                                    <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:4 }}>{m.label}</p>
                                    <p style={{ fontSize:'1.1rem', fontWeight:800, color: m.color, letterSpacing:'-0.02em' }}>{m.val ?? 0}</p>
                                    {m.bar && <MiniBar value={m.val} max={m.label==='Sent'?campaign.total_recipients:campaign.sent_count} color={m.color} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div>
                        <p style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>Message Preview</p>
                        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px 14px', maxWidth:320 }}>
                            <p style={{ fontSize:'0.85rem', lineHeight:1.6, color:'#1a2e1a', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{campaign.message_content}</p>
                            <p style={{ fontSize:'0.68rem', color:'#86efac', textAlign:'right', marginTop:6 }}>
                                {fmtDatetime(campaign.created_at)} ✓✓
                            </p>
                        </div>
                    </div>

                    {/* Meta */}
                    <div style={{ background:'#f9f8f6', border:'1px solid #e4e1db', borderRadius:10, padding:'12px 14px' }}>
                        {[
                            ['Created', fmtDate(campaign.created_at)],
                            ['Scheduled for', fmtDatetime(campaign.scheduled_for)],
                            ['Started', fmtDatetime(campaign.started_at)],
                            ['Completed', fmtDatetime(campaign.completed_at)],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f0eeea', fontSize:'0.8rem' }}>
                                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                                <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Create / Edit Modal ─────────────────────────────────────────────── */
function CampaignModal({ campaign, onClose, onSaved, waAccounts }) {
    const isEdit = !!campaign
    const now = new Date(); now.setMinutes(now.getMinutes() + 5)
    const defaultTime = now.toISOString().slice(0, 16)

    const [form, setForm] = useState({
        name: campaign?.name || '',
        message_type: campaign?.message_type || 'TEXT',
        message_content: campaign?.message_content || '',
        scheduled_for: campaign?.scheduled_for ? new Date(campaign.scheduled_for).toISOString().slice(0, 16) : '',
        whatsapp_account: campaign?.whatsapp_account || (waAccounts[0]?.id || ''),
        description: campaign?.description || '',
        sendNow: !campaign?.scheduled_for,
    })
    const [step, setStep] = useState(1)       // 1=details 2=preview
    const [busy, setBusy] = useState(false)
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const charCount = form.message_content.length
    const isValid = form.name.trim() && form.message_content.trim() && form.whatsapp_account

    const save = async () => {
        if (!isValid) { toast.error('Please fill all required fields'); return }
        setBusy(true)
        const payload = {
            name: form.name.trim(),
            message_type: form.message_type,
            message_content: form.message_content.trim(),
            whatsapp_account: form.whatsapp_account,
            description: form.description,
            scheduled_for: form.sendNow ? null : (form.scheduled_for || null),
            status: 'DRAFT',
        }
        try {
            if (isEdit) {
                await campaignsApi.update(campaign.id, payload)
                toast.success('Campaign updated!')
            } else {
                await campaignsApi.create(payload)
                toast.success('Campaign created! 🎉')
            }
            onSaved()
        } catch (err) {
            const msg = Object.values(err?.response?.data || {})[0]
            toast.error(Array.isArray(msg) ? msg[0] : (msg || 'Failed to save'))
        } finally { setBusy(false) }
    }

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:540, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.18)', animation:'fade-up 0.2s ease both' }}>

                {/* Modal header */}
                <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #e4e1db', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h2>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                            {[1, 2].map(s => (
                                <div key={s} style={{ display:'flex', alignItems:'center', gap:5 }}>
                                    <div style={{ width:20, height:20, borderRadius:'50%', background: step >= s ? '#2563eb' : '#e4e1db', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color: step >= s ? '#fff' : '#9ca3af' }}>{s}</div>
                                    <span style={{ fontSize:'0.72rem', color: step >= s ? '#2563eb' : 'var(--text-muted)', fontWeight: step >= s ? 600 : 400 }}>{s===1?'Details':'Preview'}</span>
                                    {s < 2 && <div style={{ width:20, height:1, background: step > s ? '#2563eb' : '#e4e1db' }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding:6, borderRadius:7, border:'none', background:'#f5f4f0', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                        <svg style={{ width:16, height:16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
                    {step === 1 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                            {/* Name */}
                            <div>
                                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 }}>Campaign Name *</label>
                                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Summer Sale Promo 🎉"
                                    style={{ width:'100%', padding:'9px 12px', fontSize:'0.875rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)' }}
                                    onFocus={e => e.target.style.borderColor='#93c5fd'} onBlur={e => e.target.style.borderColor='#e4e1db'} />
                            </div>

                            {/* WA Account */}
                            {waAccounts.length > 0 && (
                                <div>
                                    <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 }}>WhatsApp Account *</label>
                                    <select value={form.whatsapp_account} onChange={e => set('whatsapp_account', e.target.value)}
                                        style={{ width:'100%', padding:'9px 12px', fontSize:'0.875rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)', background:'#fff', cursor:'pointer' }}>
                                        <option value="">Select account…</option>
                                        {waAccounts.map(a => <option key={a.id} value={a.id}>{a.display_name} ({a.phone_number_id})</option>)}
                                    </select>
                                </div>
                            )}
                            {waAccounts.length === 0 && (
                                <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 12px', fontSize:'0.8rem', color:'#d97706' }}>
                                    ⚠️ No WhatsApp accounts configured. Go to <b>Settings</b> to connect one first.
                                </div>
                            )}

                            {/* Message Type */}
                            <div>
                                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 }}>Message Type</label>
                                <div style={{ display:'flex', gap:6 }}>
                                    {MSG_TYPES.map(t => (
                                        <button key={t} onClick={() => set('message_type', t)} type="button"
                                            style={{ flex:1, padding:'7px', fontSize:'0.78rem', fontWeight:600, borderRadius:8, border:`1px solid ${form.message_type===t?'#2563eb':'#e4e1db'}`, background: form.message_type===t?'#eff6ff':'#f9f8f6', color: form.message_type===t?'#2563eb':'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.12s' }}>
                                            {t==='TEXT'?'📝 Text':t==='TEMPLATE'?'📋 Template':'🖼 Image'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Content */}
                            <div>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                                    <label style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)' }}>Message Content *</label>
                                    <span style={{ fontSize:'0.7rem', color: charCount > 1000 ? '#dc2626' : 'var(--text-muted)' }}>{charCount}/1024</span>
                                </div>
                                <textarea value={form.message_content} onChange={e => set('message_content', e.target.value)}
                                    placeholder={'Hi {{name}},\n\nWe have an exclusive offer just for you! 🎁\n\nReply YES to learn more.'}
                                    rows={6} maxLength={1024}
                                    style={{ width:'100%', resize:'vertical', padding:'10px 12px', fontSize:'0.875rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)', lineHeight:1.6 }}
                                    onFocus={e => e.target.style.borderColor='#93c5fd'} onBlur={e => e.target.style.borderColor='#e4e1db'} />
                                {/* Emoji picker */}
                                <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                                    {EMOJI_LIST.map(em => (
                                        <button key={em} type="button" onClick={() => set('message_content', form.message_content + em)}
                                            style={{ fontSize:'1.1rem', padding:'2px 5px', background:'none', border:'1px solid #e4e1db', borderRadius:6, cursor:'pointer', lineHeight:1.4 }}
                                            title={`Insert ${em}`}>
                                            {em}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:5 }}>
                                    Use <code style={{ background:'#f5f4f0', padding:'1px 4px', borderRadius:4 }}>{'{{name}}'}</code> for personalization
                                </p>
                            </div>

                            {/* Scheduling */}
                            <div style={{ background:'#f9f8f6', border:'1px solid #e4e1db', borderRadius:10, padding:'14px' }}>
                                <p style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-secondary)', marginBottom:10 }}>📅 Schedule</p>
                                <div style={{ display:'flex', gap:8, marginBottom: form.sendNow ? 0 : 10 }}>
                                    <button type="button" onClick={() => set('sendNow', true)}
                                        style={{ flex:1, padding:'8px', fontSize:'0.8rem', fontWeight:600, borderRadius:8, border:`1px solid ${form.sendNow?'#16a34a':'#e4e1db'}`, background: form.sendNow?'#f0fdf4':'#fff', color: form.sendNow?'#16a34a':'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>
                                        ⚡ Launch Immediately
                                    </button>
                                    <button type="button" onClick={() => set('sendNow', false)}
                                        style={{ flex:1, padding:'8px', fontSize:'0.8rem', fontWeight:600, borderRadius:8, border:`1px solid ${!form.sendNow?'#2563eb':'#e4e1db'}`, background: !form.sendNow?'#eff6ff':'#fff', color: !form.sendNow?'#2563eb':'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>
                                        🕐 Schedule Later
                                    </button>
                                </div>
                                {!form.sendNow && (
                                    <input type="datetime-local" value={form.scheduled_for} onChange={e => set('scheduled_for', e.target.value)}
                                        min={defaultTime}
                                        style={{ width:'100%', padding:'8px 12px', fontSize:'0.875rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)', marginTop:8 }}
                                        onFocus={e => e.target.style.borderColor='#93c5fd'} onBlur={e => e.target.style.borderColor='#e4e1db'} />
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:5 }}>Description (optional)</label>
                                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Internal note about this campaign"
                                    style={{ width:'100%', padding:'9px 12px', fontSize:'0.875rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)' }}
                                    onFocus={e => e.target.style.borderColor='#93c5fd'} onBlur={e => e.target.style.borderColor='#e4e1db'} />
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: Preview */
                        <div>
                            <p style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-muted)', marginBottom:14 }}>Review your campaign before saving:</p>
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                                {[
                                    ['Campaign Name', form.name],
                                    ['Message Type', form.message_type],
                                    ['Schedule', form.sendNow ? 'Launch immediately after saving' : fmtDatetime(form.scheduled_for)],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', background:'#f9f8f6', borderRadius:8, border:'1px solid #e4e1db', fontSize:'0.82rem' }}>
                                        <span style={{ color:'var(--text-muted)' }}>{k}</span>
                                        <span style={{ color:'var(--text-primary)', fontWeight:600 }}>{v}</span>
                                    </div>
                                ))}
                                {/* Phone preview */}
                                <div>
                                    <p style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:8 }}>Message Preview:</p>
                                    <div style={{ background:'#e5ddd5', borderRadius:12, padding:16, position:'relative' }}>
                                        <div style={{ background:'#dcf8c6', borderRadius:'12px 12px 3px 12px', padding:'10px 14px', maxWidth:'75%', marginLeft:'auto', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}>
                                            <p style={{ fontSize:'0.875rem', lineHeight:1.5, color:'#1a2e1a', whiteSpace:'pre-wrap' }}>{form.message_content}</p>
                                            <p style={{ fontSize:'0.65rem', color:'#86efac', textAlign:'right', marginTop:4 }}>Now ✓✓</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {form.sendNow && (
                                <div style={{ marginTop:14, padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:'0.8rem', color:'#d97706' }}>
                                    ⚡ This campaign will be launched immediately after you click <b>Save Campaign</b>. You'll need to add contacts and launch manually.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding:'12px 20px', borderTop:'1px solid #e4e1db', display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        {step === 2 && (
                            <button onClick={() => setStep(1)} style={{ padding:'8px 14px', background:'#f5f4f0', color:'var(--text-secondary)', border:'1px solid #e4e1db', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:500, fontFamily:'var(--font)' }}>
                                ← Back
                            </button>
                        )}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                        <button onClick={onClose} style={{ padding:'8px 16px', background:'#f5f4f0', color:'var(--text-secondary)', border:'1px solid #e4e1db', borderRadius:8, cursor:'pointer', fontSize:'0.85rem', fontWeight:500, fontFamily:'var(--font)' }}>
                            Cancel
                        </button>
                        {step === 1 ? (
                            <button onClick={() => setStep(2)} disabled={!isValid}
                                style={{ padding:'8px 20px', background: isValid?'#2563eb':'#93c5fd', color:'#fff', border:'none', borderRadius:8, cursor: isValid?'pointer':'not-allowed', fontSize:'0.85rem', fontWeight:600, fontFamily:'var(--font)' }}>
                                Preview →
                            </button>
                        ) : (
                            <button onClick={save} disabled={busy}
                                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 20px', background: busy?'#93c5fd':'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor: busy?'not-allowed':'pointer', fontSize:'0.85rem', fontWeight:600, fontFamily:'var(--font)' }}>
                                {busy && <svg className="animate-spin" style={{ width:14, height:14 }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity:0.3 }}/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                                {busy ? 'Saving…' : isEdit ? '💾 Save Changes' : '✅ Save Campaign'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Main Campaigns Page ─────────────────────────────────────────────── */
export default function CampaignsPage() {
    const { currentOrg } = useAuthStore()
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading]   = useState(true)
    const [filter, setFilter]     = useState('ALL')
    const [search, setSearch]     = useState('')
    const [modal, setModal]       = useState(null)   // null | { campaign? }
    const [detail, setDetail]     = useState(null)   // campaign being viewed
    const [waAccounts, setWaAccounts] = useState([])

    /* ── Load data ───────────────────────────────── */
    const load = useCallback(() => {
        if (!currentOrg) return
        campaignsApi.list().then(r => setCampaigns(r.data.results || r.data)).finally(() => setLoading(false))
    }, [currentOrg])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        whatsappApi.accounts().then(r => setWaAccounts(r.data.results || r.data)).catch(() => {})
    }, [currentOrg])

    // Poll every 5s if any campaign is running
    useEffect(() => {
        const hasRunning = campaigns.some(c => c.status === 'RUNNING' || c.status === 'SCHEDULED')
        if (!hasRunning) return
        const t = setInterval(load, 5000)
        return () => clearInterval(t)
    }, [campaigns, load])

    /* ── Actions ─────────────────────────────────── */
    const launchCampaign = async (id) => {
        try { await campaignsApi.launch(id); toast.success('Campaign launched! 🚀'); load() }
        catch (err) { toast.error(err?.response?.data?.error || 'Launch failed') }
    }
    const pauseCampaign = async (id) => {
        try { await campaignsApi.pause(id); toast.success('Campaign paused'); load() }
        catch { toast.error('Failed to pause') }
    }
    const deleteCampaign = async (id) => {
        if (!window.confirm('Delete this campaign?')) return
        try {
            const api = (await import('../api')).default
            await api.delete(`/campaigns/${id}/`)
            toast.success('Campaign deleted'); load()
        } catch { toast.error('Delete failed') }
    }
    const duplicateCampaign = (campaign) => {
        setModal({ campaign: { ...campaign, id: undefined, name: campaign.name + ' (Copy)', status: 'DRAFT' } })
    }

    /* ── Filter + Search ─────────────────────────── */
    const displayed = campaigns.filter(c => {
        if (filter !== 'ALL' && c.status !== filter) return false
        if (search && !(c.name || '').toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    /* ── Summary stats ───────────────────────────── */
    const totalSent       = campaigns.reduce((a, c) => a + (c.sent_count || 0), 0)
    const totalDelivered  = campaigns.reduce((a, c) => a + (c.delivered_count || 0), 0)
    const totalReplied    = campaigns.reduce((a, c) => a + (c.replied_count || 0), 0)
    const activeCount     = campaigns.filter(c => c.status === 'RUNNING').length

    return (
        <div style={{ padding:'24px', background:'var(--bg-page)', minHeight:'100%' }}>

            {/* ── Header ───────────────────────────────────── */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.02em' }}>Campaigns</h1>
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>WhatsApp broadcast campaigns & analytics</p>
                </div>
                <button onClick={() => setModal({ campaign: null })}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:'0.875rem', fontWeight:700, fontFamily:'var(--font)', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
                    <svg style={{ width:15, height:15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    New Campaign
                </button>
            </div>

            {/* ── Stat Cards ───────────────────────────────── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginBottom:20 }}>
                <StatCard label="Total Campaigns" value={campaigns.length} sub={`${activeCount} running`} color="#2563eb"
                    icon={<svg style={{ width:17, height:17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>}
                />
                <StatCard label="Messages Sent" value={totalSent.toLocaleString()} sub="across all campaigns" color="#7c3aed"
                    icon={<svg style={{ width:17, height:17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>}
                />
                <StatCard label="Delivered" value={totalDelivered.toLocaleString()} sub={`${pct(totalDelivered, totalSent)}% delivery rate`} color="#16a34a"
                    icon={<svg style={{ width:17, height:17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                />
                <StatCard label="Replies" value={totalReplied.toLocaleString()} sub={`${pct(totalReplied, totalDelivered)}% reply rate`} color="#d97706"
                    icon={<svg style={{ width:17, height:17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>}
                />
            </div>

            {/* ── Filters + Search ─────────────────────────── */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ display:'flex', gap:4 }}>
                    {['ALL', 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED'].map(f => {
                        const sc = STATUS_CFG[f] || {}
                        const active = filter === f
                        return (
                            <button key={f} onClick={() => setFilter(f)}
                                style={{ padding:'5px 12px', fontSize:'0.75rem', fontWeight:600, borderRadius:99, border:`1px solid ${active ? (sc.border || '#e4e1db') : '#e4e1db'}`, background: active ? (sc.bg || '#f5f4f0') : '#fff', color: active ? (sc.color || 'var(--text-primary)') : 'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.12s' }}>
                                {f === 'ALL' ? `All (${campaigns.length})` : f}
                            </button>
                        )
                    })}
                </div>
                <div style={{ position:'relative', marginLeft:'auto' }}>
                    <svg style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…"
                        style={{ padding:'7px 12px 7px 30px', fontSize:'0.82rem', border:'1px solid #e4e1db', borderRadius:8, outline:'none', fontFamily:'var(--font)', width:200, background:'#f9f8f6' }}
                        onFocus={e => { e.target.style.borderColor='#93c5fd'; e.target.style.background='#fff' }}
                        onBlur={e => { e.target.style.borderColor='#e4e1db'; e.target.style.background='#f9f8f6' }} />
                </div>
            </div>

            {/* ── Table ────────────────────────────────────── */}
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom:'1px solid #e4e1db' }}>
                                {['Campaign', 'Status', 'Recipients', 'Sent', 'Delivered', 'Replies', 'Created', 'Actions'].map(h => (
                                    <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}><td colSpan={8} style={{ padding:'14px 16px' }}>
                                        <div className="skeleton" style={{ height:16, width:`${70 + i*10}%`, borderRadius:6 }} />
                                    </td></tr>
                                ))
                            ) : displayed.length === 0 ? (
                                <tr><td colSpan={8}>
                                    <div style={{ padding:'48px 0', textAlign:'center' }}>
                                        <svg style={{ width:40, height:40, color:'#d1d5db', margin:'0 auto 12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                                        <p style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)' }}>No campaigns yet</p>
                                        <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>Create your first campaign to start reaching customers</p>
                                        <button onClick={() => setModal({ campaign: null })}
                                            style={{ marginTop:14, padding:'8px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:'0.85rem', fontWeight:600, fontFamily:'var(--font)' }}>
                                            Create Campaign
                                        </button>
                                    </div>
                                </td></tr>
                            ) : displayed.map(c => {
                                const sc = STATUS_CFG[c.status] || STATUS_CFG.DRAFT
                                const delivRate = pct(c.delivered_count, c.sent_count)
                                return (
                                    <tr key={c.id} style={{ borderBottom:'1px solid #f0eeea', cursor:'pointer', transition:'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background='#f9f8f6'}
                                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                                        onClick={() => setDetail(c)}>
                                        <td style={{ padding:'13px 16px' }}>
                                            <p style={{ fontWeight:600, color:'var(--text-primary)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                                            {c.description && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.description}</p>}
                                        </td>
                                        <td style={{ padding:'13px 16px', whiteSpace:'nowrap' }}>
                                            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.72rem', fontWeight:700, padding:'3px 10px', borderRadius:99, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                                                <span style={{ width:6, height:6, borderRadius:'50%', background:sc.dot }} />
                                                {sc.label}
                                            </span>
                                        </td>
                                        <td style={{ padding:'13px 16px', color:'var(--text-secondary)', fontWeight:500 }}>{c.total_recipients || 0}</td>
                                        <td style={{ padding:'13px 16px', color:'var(--text-secondary)' }}>{c.sent_count || 0}</td>
                                        <td style={{ padding:'13px 16px' }}>
                                            <MiniBar value={c.delivered_count} max={c.sent_count} color="#16a34a" />
                                        </td>
                                        <td style={{ padding:'13px 16px', color:'var(--text-secondary)' }}>{c.replied_count || 0}</td>
                                        <td style={{ padding:'13px 16px', color:'var(--text-muted)', fontSize:'0.78rem', whiteSpace:'nowrap' }}>{fmtDate(c.created_at)}</td>
                                        <td style={{ padding:'13px 16px' }}>
                                            <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                                                {c.status === 'DRAFT' && (
                                                    <button onClick={() => launchCampaign(c.id)}
                                                        style={{ padding:'5px 10px', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, cursor:'pointer', fontSize:'0.75rem', fontWeight:700, fontFamily:'var(--font)' }}>
                                                        🚀 Launch
                                                    </button>
                                                )}
                                                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                                                    <button onClick={() => setModal({ campaign: c })}
                                                        style={{ padding:'5px 10px', background:'#f5f4f0', color:'var(--text-secondary)', border:'1px solid #e4e1db', borderRadius:7, cursor:'pointer', fontSize:'0.75rem', fontFamily:'var(--font)' }}>
                                                        Edit
                                                    </button>
                                                )}
                                                <button onClick={() => deleteCampaign(c.id)}
                                                    style={{ padding:'5px 8px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:7, cursor:'pointer', fontSize:'0.75rem', fontFamily:'var(--font)' }}>
                                                    🗑
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────── */}
            {modal && (
                <CampaignModal
                    campaign={modal.campaign}
                    waAccounts={waAccounts}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load() }}
                />
            )}
            {detail && (
                <CampaignDetail
                    campaign={detail}
                    onClose={() => setDetail(null)}
                    onLaunch={launchCampaign}
                    onPause={pauseCampaign}
                    onDelete={deleteCampaign}
                    onDuplicate={c => { setDetail(null); setModal({ campaign: c }) }}
                />
            )}
        </div>
    )
}
