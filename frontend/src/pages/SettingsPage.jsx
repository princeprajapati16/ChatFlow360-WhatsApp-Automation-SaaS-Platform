import { useEffect, useState, useCallback } from 'react'
import api, { orgApi, whatsappApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Shared UI ─────────────────────────────────────────────────────── */
function Skeleton({ w = '100%', h = 14, r = 6, style = {} }) {
    return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#f0eeea 25%,#e8e5e0 50%,#f0eeea 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite', ...style }} />
}
function Toggle({ value, onChange, disabled }) {
    return (
        <button onClick={onChange} disabled={disabled}
            style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: value ? '#2563eb' : '#e4e1db', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.25s', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}>
            <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        </button>
    )
}
function Avatar({ name, size = 36 }) {
    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
    return <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
}
function Spinner({ size = 15, color = 'currentColor' }) {
    return <svg className="animate-spin" style={{ width: size, height: size }} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" style={{ opacity: 0.25 }} /><path fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
}
function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false)
    return (
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            style={{ padding: '4px 12px', fontSize: '0.72rem', background: copied ? '#f0fdf4' : '#eff6ff', color: copied ? '#16a34a' : '#2563eb', border: `1px solid ${copied ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: 7, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {copied ? '✓ Copied' : 'Copy'}
        </button>
    )
}

const WA_ICON = ({ size = 20 }) => (
    <svg style={{ width: size, height: size }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.484 3.488" />
    </svg>
)

const ROLE_LABELS = { SUPER_ADMIN: 'Super Admin', BUSINESS_ADMIN: 'Admin', AGENT: 'Agent' }
const ROLE_COLORS = {
    SUPER_ADMIN: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    BUSINESS_ADMIN: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    AGENT: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
}
const NOTIF_SETTINGS = [
    { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates and alerts via email' },
    { key: 'whatsapp_alerts', label: 'WhatsApp Alerts', desc: 'Get notified on your WhatsApp number' },
    { key: 'campaign_updates', label: 'Campaign Updates', desc: 'Updates on campaign deliveries and performance' },
    { key: 'lead_alerts', label: 'Lead Alerts', desc: 'Notify when new leads are created or stage changes' },
    { key: 'system_announcements', label: 'System Announcements', desc: 'Platform updates, maintenance notices' },
]
const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney']

const TABS = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'workspace', label: 'Workspace', icon: '🏢' },
    { key: 'team', label: 'Team', icon: '👥' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '📱' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
]

function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

/* ══════════════════════════════════════════════════════════════════════
   WHATSAPP TAB — Connected panel
══════════════════════════════════════════════════════════════════════ */
function WAConnectedPanel({ waConfig, onDisconnect, onUpdate, webhookUrl, waDisconnecting }) {
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            const { data } = await whatsappApi.testConnection()
            setTestResult({ success: true, ...data })
            toast.success('Connection test passed ✅')
        } catch (err) {
            const msg = err?.response?.data?.error || 'Test failed'
            setTestResult({ success: false, error: msg })
            toast.error(msg)
        } finally {
            setTesting(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Connected status card ── */}
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                            <WA_ICON />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp Connection</h2>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 1 }}>Your WhatsApp Business Cloud API number</p>
                        </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, letterSpacing: '0.04em' }}>
                        ● CONNECTED
                    </span>
                </div>

                <div style={{ padding: '20px 24px' }}>
                    {/* Main status block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #bbf7d0', borderRadius: 12, marginBottom: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <WA_ICON size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#14532d' }}>{waConfig.display_name || 'WhatsApp Business'}</p>
                            <p style={{ fontSize: '0.8rem', color: '#166534', fontFamily: 'monospace', marginTop: 2 }}>
                                {waConfig.display_phone_number && <span>{waConfig.display_phone_number} &bull; </span>}
                                ID: {waConfig.phone_number_id}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 4 }}>
                                Connected since {formatDate(waConfig.connected_at || waConfig.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {[
                            { label: 'Phone Number', value: waConfig.display_phone_number || '—' },
                            { label: 'Phone Number ID', value: waConfig.phone_number_id },
                            { label: 'Access Token', value: waConfig.token_masked || '••••••••' },
                            { label: 'Connected Since', value: formatDate(waConfig.connected_at || waConfig.created_at) },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ padding: '10px 14px', background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 9 }}>
                                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Test result */}
                    {testResult && (
                        <div style={{ marginBottom: 14, padding: '12px 14px', background: testResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`, borderRadius: 9 }}>
                            {testResult.success ? (
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✅ Connection test passed!</p>
                                    <p style={{ fontSize: '0.75rem', color: '#15803d' }}>
                                        Number: {testResult.display_phone_number} &bull; Quality: {testResult.quality_rating || 'N/A'} &bull; Status: {testResult.code_verification_status || 'verified'}
                                    </p>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.8rem', color: '#dc2626' }}>❌ {testResult.error}</p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={handleTest} disabled={testing}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                            {testing ? <><Spinner size={14} color="#1d4ed8" /> Testing…</> : '🔍 Test Connection'}
                        </button>
                        <button onClick={onUpdate}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                            ✏️ Update Credentials
                        </button>
                        <button onClick={() => setShowDisconnectConfirm(true)} disabled={waDisconnecting}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)', marginLeft: 'auto' }}>
                            {waDisconnecting ? <><Spinner size={14} color="#dc2626" /> Disconnecting…</> : '🔌 Disconnect'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Disconnect confirmation dialog */}
            {showDisconnectConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>⚠️</div>
                            <h2 style={{ textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Disconnect WhatsApp?</h2>
                            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                                This will stop receiving messages from <strong>{waConfig.display_phone_number || 'your number'}</strong>. All existing conversations will remain in your inbox.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowDisconnectConfirm(false)}
                                    style={{ flex: 1, padding: '10px', background: '#f9f8f6', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font)' }}>
                                    Cancel
                                </button>
                                <button onClick={() => { setShowDisconnectConfirm(false); onDisconnect() }}
                                    style={{ flex: 1, padding: '10px', background: '#dc2626', border: 'none', color: '#fff', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font)' }}>
                                    Yes, Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Webhook config card */}
            <WAWebhookCard waConfig={waConfig} webhookUrl={webhookUrl} />
        </div>
    )
}

/* ── Webhook card (used in both states) ── */
function WAWebhookCard({ waConfig, webhookUrl }) {
    return (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>🔗</span> Webhook Configuration
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Webhook URL — paste this in Meta Developer Console
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <code style={{ flex: 1, padding: '9px 12px', background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 8, fontSize: '0.78rem', color: '#2563eb', wordBreak: 'break-all', minWidth: 0 }}>
                            {webhookUrl}
                        </code>
                        <CopyBtn text={webhookUrl} />
                    </div>
                </div>
                {waConfig?.webhook_verify_token && (
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                            Verify Token — paste in Meta Console webhook config
                        </label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ flex: 1, padding: '9px 12px', background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 8, fontSize: '0.78rem', color: '#7c3aed', wordBreak: 'break-all', minWidth: 0 }}>
                                {waConfig.webhook_verify_token}
                            </code>
                            <CopyBtn text={waConfig.webhook_verify_token} />
                        </div>
                    </div>
                )}
            </div>

            {/* Setup guide */}
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>📋 Webhook Setup in Meta Console:</p>
                {[
                    'Go to developers.facebook.com → Your App → WhatsApp → Configuration',
                    'Under "Webhook", click Edit and paste the Webhook URL above',
                    'Paste your Verify Token (shown above) in the Verify Token field',
                    'Subscribe to fields: messages, message_deliveries, message_reads',
                    'Click Verify and Save — your webhook is now active ✅',
                ].map((step, i) => (
                    <p key={i} style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.7 }}><strong>{i + 1}.</strong> {step}</p>
                ))}
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
    const { user, currentOrg, setCurrentOrg } = useAuthStore()
    const [activeTab, setActiveTab] = useState('profile')

    // Profile
    const [profileForm, setProfileForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' })
    const [savingProfile, setSavingProfile] = useState(false)

    // Workspace
    const [orgName, setOrgName] = useState(currentOrg?.name || '')
    const [orgTimezone, setOrgTimezone] = useState('Asia/Kolkata')
    const [savingWorkspace, setSavingWorkspace] = useState(false)

    // Team
    const [members, setMembers] = useState([])
    const [membersLoading, setMembersLoading] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role: 'AGENT' })
    const [inviting, setInviting] = useState(false)

    // WhatsApp
    const [waConfig, setWaConfig] = useState(null)
    const [waLoading, setWaLoading] = useState(false)
    const [showWAForm, setShowWAForm] = useState(false)
    const [waConnecting, setWaConnecting] = useState(false)
    const [demoConnecting, setDemoConnecting] = useState(false)
    const [waDisconnecting, setWaDisconnecting] = useState(false)
    const [generatingToken, setGeneratingToken] = useState(false)
    const [waForm, setWaForm] = useState({
        display_name: '', phone_number_id: '', whatsapp_business_account_id: '',
        access_token: '', webhook_verify_token: '', display_phone_number: ''
    })
    const [showToken, setShowToken] = useState(false)

    // Notifications
    const [notifPrefs, setNotifPrefs] = useState({ email_notifications: true, whatsapp_alerts: true, campaign_updates: true, lead_alerts: true, system_announcements: true })
    const [notifLoading, setNotifLoading] = useState(false)

    useEffect(() => { setOrgName(currentOrg?.name || '') }, [currentOrg])

    const loadTeam = useCallback(() => {
        if (!currentOrg) return
        setMembersLoading(true)
        api.get(`/organizations/${currentOrg.id}/members/`)
            .then(r => setMembers(r.data.results || r.data || []))
            .catch(() => setMembers([]))
            .finally(() => setMembersLoading(false))
    }, [currentOrg])

    const loadWA = useCallback(() => {
        if (!currentOrg) return
        setWaLoading(true)
        whatsappApi.getConfig()
            .then(r => setWaConfig(r.data))
            .catch(() => setWaConfig({ connected: false, account: null }))
            .finally(() => setWaLoading(false))
    }, [currentOrg])

    const loadNotifPrefs = useCallback(() => {
        setNotifLoading(true)
        api.get('/settings/notifications/').then(r => setNotifPrefs(r.data)).catch(() => { }).finally(() => setNotifLoading(false))
    }, [])

    useEffect(() => {
        if (activeTab === 'team') loadTeam()
        if (activeTab === 'whatsapp') loadWA()
        if (activeTab === 'notifications') loadNotifPrefs()
    }, [activeTab, currentOrg, loadTeam, loadWA, loadNotifPrefs])

    const saveProfile = async () => {
        if (!profileForm.first_name.trim()) return toast.error('First name is required')
        setSavingProfile(true)
        try {
            const res = await api.patch('/settings/update-profile/', profileForm)
            useAuthStore.setState({ user: { ...user, ...res.data.user } })
            localStorage.setItem('user', JSON.stringify({ ...user, ...res.data.user }))
            toast.success('Name updated successfully')
        } catch (err) { 
            toast.error(err?.response?.data?.error || 'Failed to update profile') 
        } finally { 
            setSavingProfile(false) 
        }
    }

    const saveWorkspace = async () => {
        if (!orgName.trim()) return toast.error('Name is required')
        setSavingWorkspace(true)
        try {
            await api.patch(`/organizations/${currentOrg.id}/`, { name: orgName.trim() }).catch(() => { })
            setCurrentOrg({ ...currentOrg, name: orgName.trim() })
            toast.success('Workspace settings saved!')
        } catch { toast.error('Failed to save') } finally { setSavingWorkspace(false) }
    }

    const inviteMember = async (e) => {
        e.preventDefault()
        if (!inviteForm.email.trim()) return
        setInviting(true)
        try {
            await api.post(`/organizations/${currentOrg.id}/members/`, inviteForm)
            toast.success(`Invited ${inviteForm.email}`)
            setShowInviteModal(false)
            setInviteForm({ email: '', first_name: '', last_name: '', role: 'AGENT' })
            loadTeam()
        } catch (err) { toast.error(err?.response?.data?.error || 'Failed to invite') } finally { setInviting(false) }
    }

    const removeMember = async (memberId) => {
        if (!confirm('Remove this member?')) return
        try {
            await api.delete(`/organizations/${currentOrg.id}/members/${memberId}/`)
            toast.success('Member removed')
            loadTeam()
        } catch (err) { toast.error(err?.response?.data?.error || 'Failed to remove') }
    }

    const generateVerifyToken = async () => {
        setGeneratingToken(true)
        try {
            const { data } = await whatsappApi.generateToken()
            setWaForm(prev => ({ ...prev, webhook_verify_token: data.verify_token }))
            toast.success('Secure token generated!')
        } catch {
            // Fallback: generate client-side
            const token = `cf360_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
            setWaForm(prev => ({ ...prev, webhook_verify_token: token }))
        } finally { setGeneratingToken(false) }
    }

    const connectWA = async (e) => {
        e.preventDefault()
        if (!waForm.phone_number_id.trim() || !waForm.access_token.trim()) {
            toast.error('Phone Number ID and Access Token are required')
            return
        }
        setWaConnecting(true)
        try {
            const { data } = await whatsappApi.connect(waForm)
            setWaConfig({ ...data, connected: true })
            toast.success('WhatsApp connected successfully!')
            setShowWAForm(false)
            setWaForm({ display_name: '', phone_number_id: '', whatsapp_business_account_id: '', access_token: '', webhook_verify_token: '', display_phone_number: '' })
        } catch (err) {
            const msg = err?.response?.data?.error || 'Connection failed. Check your credentials.'
            toast.error(msg)
        } finally { setWaConnecting(false) }
    }

    const connectDemoWA = async () => {
        setDemoConnecting(true)
        try {
            const { data } = await whatsappApi.connectDemo({
                display_name: waForm.display_name || 'Demo Business',
                display_phone_number: waForm.display_phone_number || '+91 98765 43210',
            })
            setWaConfig({ ...data, connected: true })
            toast.success('🎉 Demo WhatsApp connected! (No real Meta account needed)')
            setShowWAForm(false)
            setWaForm({ display_name: '', phone_number_id: '', whatsapp_business_account_id: '', access_token: '', webhook_verify_token: '', display_phone_number: '' })
        } catch (err) {
            const msg = err?.response?.data?.error || 'Demo connection failed'
            toast.error(msg)
        } finally { setDemoConnecting(false) }
    }

    const disconnectWA = async () => {
        setWaDisconnecting(true)
        try {
            await whatsappApi.disconnect()
            setWaConfig({ connected: false, account: null })
            toast.success('WhatsApp disconnected')
        } catch { toast.error('Failed to disconnect') } finally { setWaDisconnecting(false) }
    }

    const saveNotifPref = async (key, value) => {
        const updated = { ...notifPrefs, [key]: value }
        setNotifPrefs(updated)
        try {
            await api.put('/settings/notifications/', updated)
            toast.success('Saved')
        } catch { toast.error('Failed to save') }
    }

    const webhookUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1/whatsapp/webhook/`

    return (
        <div style={{ padding: 28, maxWidth: 940 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Settings</h1>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>Manage workspace, team, WhatsApp connection and notifications</p>
            </div>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                {/* Sidebar tabs */}
                <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                                borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                                fontSize: '0.85rem', fontWeight: activeTab === t.key ? 600 : 400, textAlign: 'left',
                                background: activeTab === t.key ? '#eff6ff' : 'transparent',
                                color: activeTab === t.key ? '#2563eb' : 'var(--text-secondary)', transition: 'all 0.15s',
                            }}>
                            <span>{t.icon}</span>{t.label}
                        </button>
                    ))}
                    <div style={{ marginTop: 20, padding: '14px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
                        <Avatar name={`${user?.first_name} ${user?.last_name}`} size={36} />
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 8, wordBreak: 'break-all' }}>{user?.first_name} {user?.last_name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{user?.email}</p>
                        <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.65rem', padding: '2px 7px', borderRadius: 99, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 600 }}>
                            {user?.role || 'USER'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>

                    {/* ── PROFILE ───────────────────────────────────── */}
                    {activeTab === 'profile' && (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Personal Profile</h2>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Update your personal information</p>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label className="label">First Name</label>
                                            <input className="input" value={profileForm.first_name} onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="John" />
                                        </div>
                                        <div>
                                            <label className="label">Last Name</label>
                                            <input className="input" value={profileForm.last_name} onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Doe" />
                                        </div>
                                    </div>
                                    <button onClick={saveProfile} disabled={savingProfile || !profileForm.first_name.trim()} className="btn-primary">
                                        {savingProfile ? <><Spinner /> Saving…</> : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── WORKSPACE ─────────────────────────────────── */}
                    {activeTab === 'workspace' && (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Workspace Settings</h2>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Update your organization details</p>
                            </div>
                            <div style={{ padding: '24px' }}>
                                {!currentOrg ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No workspace selected.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                                        <div>
                                            <label className="label">Workspace Name</label>
                                            <input className="input" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your company name" />
                                        </div>
                                        <div>
                                            <label className="label">Timezone</label>
                                            <select className="input" value={orgTimezone} onChange={e => setOrgTimezone(e.target.value)}>
                                                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Workspace ID</label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input className="input" value={currentOrg.id} readOnly style={{ flex: 1, background: '#f9f8f6', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }} />
                                                <CopyBtn text={currentOrg.id} />
                                            </div>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Pass as X-Organization-ID header in API requests.</p>
                                        </div>
                                        <button onClick={saveWorkspace} disabled={savingWorkspace || !orgName.trim()} className="btn-primary">
                                            {savingWorkspace ? <><Spinner /> Saving…</> : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TEAM ──────────────────────────────────────── */}
                    {activeTab === 'team' && (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Team Members</h2>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{members.length} member{members.length !== 1 ? 's' : ''} in {currentOrg?.name}</p>
                                </div>
                                <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ fontSize: '0.8rem' }}>+ Invite Member</button>
                            </div>
                            {membersLoading ? (
                                <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <Skeleton w={40} h={40} r={20} />
                                            <div style={{ flex: 1 }}><Skeleton w="40%" h={12} /><Skeleton w="60%" h={10} /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : members.length === 0 ? (
                                <div style={{ padding: '48px', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No team members yet. Invite your first team member!</p>
                                </div>
                            ) : (
                                members.map((member, i) => {
                                    const rc = ROLE_COLORS[member.role] || ROLE_COLORS.AGENT
                                    const mu = member.user || member
                                    const name = `${mu.first_name || ''} ${mu.last_name || ''}`.trim() || mu.email
                                    return (
                                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <Avatar name={name} size={40} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mu.email}</p>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, fontWeight: 700, flexShrink: 0 }}>
                                                {ROLE_LABELS[member.role] || member.role}
                                            </span>
                                            {mu.email !== user?.email && (
                                                <button onClick={() => removeMember(member.id)} style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 7, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {/* ── WHATSAPP ──────────────────────────────────── */}
                    {activeTab === 'whatsapp' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {waLoading ? (
                                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                    <Skeleton w="60%" h={20} style={{ marginBottom: 10 }} />
                                    <Skeleton w="40%" h={14} style={{ marginBottom: 8 }} />
                                    <Skeleton w="80%" h={14} />
                                </div>
                            ) : waConfig?.connected ? (
                                <WAConnectedPanel
                                    waConfig={waConfig}
                                    onDisconnect={disconnectWA}
                                    onUpdate={() => setShowWAForm(true)}
                                    webhookUrl={webhookUrl}
                                    waDisconnecting={waDisconnecting}
                                />
                            ) : (
                                /* ── Disconnected state ── */
                                <>
                                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f9f8f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                                    <WA_ICON />
                                                </div>
                                                <div>
                                                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp Connection</h2>
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 1 }}>Connect your WhatsApp Business Cloud API number</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowWAForm(true)} className="btn-primary" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span>+</span> Connect Number
                                            </button>
                                        </div>
                                        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f9f8f6', border: '2px dashed #e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#9ca3af' }}>
                                                <WA_ICON size={28} />
                                            </div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No WhatsApp number connected</p>
                                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
                                                Connect your WhatsApp Business Cloud API number to start receiving and sending messages from your dashboard.
                                            </p>
                                            <button onClick={() => setShowWAForm(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}>
                                                <WA_ICON size={16} /> Connect WhatsApp Number
                                            </button>
                                        </div>
                                    </div>

                                    {/* Step-by-step guide (disconnected state) */}
                                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
                                        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>📋</span> How to Connect WhatsApp Business API
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {[
                                                { step: 1, title: 'Go to Meta Developer Console', desc: 'Visit developers.facebook.com and log in with your Facebook account', link: 'https://developers.facebook.com' },
                                                { step: 2, title: 'Create App → WhatsApp → Add Phone Number', desc: 'Create a new Business App and add your WhatsApp Business phone number' },
                                                { step: 3, title: 'Copy Phone Number ID & Access Token', desc: 'From WhatsApp → API Setup, copy the Phone Number ID and generate a permanent System User Access Token in Business Settings' },
                                                { step: 4, title: 'Paste here and click Connect', desc: 'Fill in the form on this page — we\'ll verify your credentials against the Meta API instantly' },
                                                { step: 5, title: 'Configure Webhook in Meta Console', desc: 'Copy the Webhook URL and Verify Token shown after connecting, paste them into Meta Console → WhatsApp → Configuration → Webhook' },
                                            ].map(({ step, title, desc, link }) => (
                                                <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                                                        {step}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                                                            {title}
                                                            {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, fontSize: '0.7rem', color: '#2563eb', textDecoration: 'none' }}>→ Open</a>}
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Webhook URL preview */}
                                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
                                        <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>🔗</span> Your Webhook URL
                                        </h3>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>Copy this and paste it in Meta Developer Console → WhatsApp → Configuration → Webhook:</p>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <code style={{ flex: 1, padding: '9px 12px', background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 8, fontSize: '0.78rem', color: '#2563eb', wordBreak: 'break-all', minWidth: 0 }}>
                                                {webhookUrl}
                                            </code>
                                            <CopyBtn text={webhookUrl} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── NOTIFICATIONS ─────────────────────────────── */}
                    {activeTab === 'notifications' && (
                        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notification Preferences</h2>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Choose how you'd like to be notified</p>
                            </div>
                            <div style={{ padding: '8px 0' }}>
                                {notifLoading ? (
                                    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}><Skeleton w="40%" h={13} /><Skeleton w="65%" h={11} style={{ marginTop: 6 }} /></div>
                                                <Skeleton w={44} h={24} r={12} />
                                            </div>
                                        ))}
                                    </div>
                                ) : NOTIF_SETTINGS.map((s, i) => (
                                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < NOTIF_SETTINGS.length - 1 ? '1px solid #f0eeea' : 'none', transition: 'background 0.1s', cursor: 'default' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{s.label}</p>
                                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.desc}</p>
                                        </div>
                                        <Toggle value={notifPrefs[s.key]} onChange={() => saveNotifPref(s.key, !notifPrefs[s.key])} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Invite Modal ── */}
            {showInviteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Invite Team Member</h2>
                            <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <form onSubmit={inviteMember}>
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label className="label">Email Address *</label>
                                    <input className="input" type="email" placeholder="agent@company.com" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required autoFocus />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div><label className="label">First Name</label><input className="input" placeholder="John" value={inviteForm.first_name} onChange={e => setInviteForm({ ...inviteForm, first_name: e.target.value })} /></div>
                                    <div><label className="label">Last Name</label><input className="input" placeholder="Doe" value={inviteForm.last_name} onChange={e => setInviteForm({ ...inviteForm, last_name: e.target.value })} /></div>
                                </div>
                                <div>
                                    <label className="label">Role</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {Object.entries(ROLE_LABELS).map(([k, v]) => {
                                            const rc = ROLE_COLORS[k]
                                            return (
                                                <button key={k} type="button" onClick={() => setInviteForm({ ...inviteForm, role: k })}
                                                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${inviteForm.role === k ? rc.border : 'var(--border)'}`, background: inviteForm.role === k ? rc.bg : 'transparent', color: inviteForm.role === k ? rc.text : 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: inviteForm.role === k ? 700 : 400 }}>
                                                    {v}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" disabled={inviting || !inviteForm.email.trim()} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                    {inviting ? <><Spinner /> Inviting…</> : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── WhatsApp Connect Modal ── */}
            {showWAForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '92vh', overflowY: 'auto' }}>
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}><WA_ICON /></div>
                                <div>
                                    <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Connect WhatsApp Number</h2>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Via WhatsApp Business Cloud API</p>
                                </div>
                            </div>
                            <button onClick={() => setShowWAForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        <form onSubmit={connectWA}>
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* Step guide */}
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.7 }}>
                                    <p style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>📋 Where to find these credentials:</p>
                                    <p>1. Go to <strong>developers.facebook.com</strong> → Your App → WhatsApp → <strong>API Setup</strong></p>
                                    <p>2. Find your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong> in the panel</p>
                                    <p>3. Generate a <strong>Permanent System User Access Token</strong> via Business Settings → System Users</p>
                                    <p>4. After connecting, copy the Webhook URL + Verify Token and paste in Meta Console → Webhook</p>
                                </div>

                                {/* Display Name */}
                                <div>
                                    <label className="label">Display Name <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                                    <input className="input" placeholder="e.g. Support Line, Sales Bot" value={waForm.display_name} onChange={e => setWaForm({ ...waForm, display_name: e.target.value })} />
                                </div>

                                {/* Phone number + ID */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label className="label">Display Phone Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                                        <input className="input" placeholder="+91 98765 43210" value={waForm.display_phone_number} onChange={e => setWaForm({ ...waForm, display_phone_number: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Phone Number ID <span style={{ color: '#dc2626' }}>*</span></label>
                                        <input className="input" placeholder="From Meta Console" value={waForm.phone_number_id} onChange={e => setWaForm({ ...waForm, phone_number_id: e.target.value })} required />
                                    </div>
                                </div>

                                {/* WABA ID */}
                                <div>
                                    <label className="label">WhatsApp Business Account ID <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                                    <input className="input" placeholder="WABA ID from Meta Console" value={waForm.whatsapp_business_account_id} onChange={e => setWaForm({ ...waForm, whatsapp_business_account_id: e.target.value })} />
                                </div>

                                {/* Access Token */}
                                <div>
                                    <label className="label">Permanent Access Token <span style={{ color: '#dc2626' }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="input" type={showToken ? 'text' : 'password'} placeholder="System User permanent access token from Meta Business Settings" value={waForm.access_token} onChange={e => setWaForm({ ...waForm, access_token: e.target.value })} required style={{ paddingRight: 52 }} />
                                        <button type="button" tabIndex={-1} onClick={() => setShowToken(p => !p)}
                                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, padding: 0 }}>
                                            {showToken ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>🔒 Stored securely. We test this token against the Meta API on connect.</p>
                                </div>

                                {/* Webhook Verify Token */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label className="label" style={{ margin: 0 }}>Webhook Verify Token</label>
                                        <button type="button" onClick={generateVerifyToken} disabled={generatingToken}
                                            style={{ fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {generatingToken ? <Spinner size={12} color="#7c3aed" /> : '⚡'} Auto-Generate
                                        </button>
                                    </div>
                                    <input className="input" placeholder="e.g. cf360_my_secret_token_123" value={waForm.webhook_verify_token} onChange={e => setWaForm({ ...waForm, webhook_verify_token: e.target.value })} />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Set this same value in Meta Console → Webhook configuration. Click Auto-Generate to create a secure random token.</p>
                                </div>

                                {/* Webhook URL preview */}
                                <div style={{ background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 8, padding: '10px 12px' }}>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>🔗 Webhook URL (paste this in Meta Console):</p>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <code style={{ flex: 1, fontSize: '0.72rem', color: '#2563eb', wordBreak: 'break-all', minWidth: 0 }}>{webhookUrl}</code>
                                        <CopyBtn text={webhookUrl} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" onClick={() => setShowWAForm(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                    <button type="submit" id="whatsapp-connect-btn" disabled={waConnecting || demoConnecting} className="btn-primary" style={{ flex: 2, justifyContent: 'center', background: '#25d366', borderColor: '#25d366' }}>
                                        {waConnecting ? <><Spinner /> Verifying with Meta…</> : '🔗 Connect WhatsApp'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or for development</span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                </div>
                                <button type="button" id="whatsapp-demo-btn" onClick={connectDemoWA} disabled={demoConnecting || waConnecting}
                                    style={{ width: '100%', padding: '9px', background: demoConnecting ? '#f3f4f6' : '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
                                    {demoConnecting ? <><Spinner size={14} color="#7c3aed" /> Creating demo…</> : '⚡ Use Demo Mode (No Meta account needed)'}
                                </button>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: -4 }}>Demo mode creates a test connection. Incoming messages won't work but the full UI will be functional.</p>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
    )
}
