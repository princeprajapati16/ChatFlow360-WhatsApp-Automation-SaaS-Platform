import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, orgApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Shared Components ─────────────────────────────────────────────── */
function Logo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
                <svg style={{ width: 20, height: 20, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>ChatFlow<span style={{ color: '#2563eb' }}>360</span></span>
        </div>
    )
}

function Spinner() {
    return (
        <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
            <path fill="currentColor" style={{ opacity: 0.9 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

function FieldError({ msg }) {
    if (!msg) return null
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <svg style={{ width: 13, height: 13, color: '#dc2626', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>{msg}</p>
        </div>
    )
}

function InputField({ label, type = 'text', value, onChange, placeholder, autoComplete, error, hint, showToggle, onToggle, showValue, required }) {
    const [focused, setFocused] = useState(false)
    const hasError = !!error
    const borderColor = hasError ? '#fca5a5' : focused ? '#93c5fd' : '#e4e1db'
    const shadow = hasError ? '0 0 0 3px rgba(220,38,38,0.1)' : focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none'

    return (
        <div>
            {label && (
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: hasError ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                    {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                <input
                    type={showToggle ? (showValue ? 'text' : 'password') : type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: '100%', padding: showToggle ? '10px 42px 10px 14px' : '10px 14px',
                        fontSize: '0.9rem', border: `1.5px solid ${borderColor}`,
                        borderRadius: 10, outline: 'none', fontFamily: 'var(--font)',
                        background: hasError ? '#fff5f5' : '#fff',
                        boxShadow: shadow, transition: 'all 0.15s',
                        color: 'var(--text-primary)',
                    }}
                />
                {showToggle && (
                    <button type="button" onClick={onToggle}
                        tabIndex={-1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                        {showValue
                            ? <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        }
                    </button>
                )}
            </div>
            <FieldError msg={error} />
            {hint && !error && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>}
        </div>
    )
}

const FEATURES = [
    { icon: '💬', title: 'Team Inbox', desc: 'Shared real-time WhatsApp inbox for your whole team' },
    { icon: '🤖', title: 'Automation', desc: 'Auto-reply rules & multi-step chatbot flows' },
    { icon: '📊', title: 'Lead Pipeline', desc: 'Visual CRM with Kanban & conversion tracking' },
    { icon: '📣', title: 'Campaigns', desc: 'Broadcast messages to thousands with one click' },
]

function AuthRightPanel({ title, subtitle }) {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '48px 56px',
            background: 'linear-gradient(145deg, #eff6ff 0%, #f5f3ff 40%, #f0fdf4 100%)',
        }}>
            <div style={{ maxWidth: 380, width: '100%' }}>
                <div style={{ width: 68, height: 68, borderRadius: 18, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(37,99,235,0.3)' }}>
                    <svg style={{ width: 32, height: 32, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 10, lineHeight: 1.2 }}>
                    {title}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center', marginBottom: 32 }}>
                    {subtitle}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {FEATURES.map(f => (
                        <div key={f.title} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#fff', border: '1px solid rgba(37,99,235,0.1)',
                            borderRadius: 12, padding: '10px 16px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                        >
                            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon}</span>
                            <div>
                                <p style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{f.title}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p style={{ marginTop: 24, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Trusted by <strong style={{ color: 'var(--text-secondary)' }}>1,000+</strong> businesses worldwide
                </p>
            </div>
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [showPw, setShowPw] = useState(false)
    const navigate = useNavigate()
    const { setAuth, setCurrentOrg, setOrgs, accessToken } = useAuthStore()

    // Auto-redirect if already logged in
    useEffect(() => {
        if (accessToken) navigate('/dashboard', { replace: true })
    }, [accessToken, navigate])

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }))
        // Clear field error as user types
        if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
    }

    const validate = () => {
        const errs = {}
        if (!form.email.trim()) errs.email = 'Email address is required.'
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Please enter a valid email address.'
        if (!form.password) errs.password = 'Password is required.'
        return errs
    }

    const handle = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        setLoading(true)
        setErrors({})
        try {
            const { data } = await authApi.login({ email: form.email.trim().toLowerCase(), password: form.password })

            // Store auth state
            setAuth(data.user, data.access, data.refresh)

            // Store org if returned
            if (data.org) {
                setCurrentOrg(data.org)
                orgApi.list().then(r => {
                    const orgs = r.data.results || r.data || []
                    setOrgs(orgs)
                    if (!data.org && orgs.length > 0) setCurrentOrg(orgs[0])
                }).catch(() => { })
            }

            toast.success(`Welcome back, ${data.user?.first_name || 'there'}! 👋`)
            navigate('/dashboard', { replace: true })
        } catch (err) {
            const resData = err.response?.data
            if (resData?.field && resData?.message) {
                setErrors({ [resData.field]: resData.message })
            } else if (resData?.detail) {
                setErrors({ password: resData.detail })
            } else {
                setErrors({ password: 'Invalid email or password. Please try again.' })
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)' }}>

            {/* ── Left: Login Form ──────────────────────────────── */}
            <div style={{
                width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: '52px 52px',
                background: '#fff', borderRight: '1px solid var(--border)',
                overflowY: 'auto',
            }}>
                <div style={{ marginBottom: 36 }}>
                    <Logo />
                    <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginTop: 32, marginBottom: 6 }}>
                        Welcome back
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Sign in to your workspace and continue where you left off.
                    </p>
                </div>

                <form onSubmit={handle} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <InputField
                        label="Email address" type="email"
                        value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="you@company.com" autoComplete="email"
                        error={errors.email} required
                    />
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: errors.password ? '#dc2626' : 'var(--text-secondary)' }}>
                                Password <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                                Forgot password?
                            </Link>
                        </div>
                        <InputField
                            type="password" value={form.password} onChange={e => set('password', e.target.value)}
                            placeholder="••••••••" autoComplete="current-password"
                            error={errors.password}
                            showToggle onToggle={() => setShowPw(p => !p)} showValue={showPw}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                            color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font)',
                            marginTop: 4, boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                    >
                        {loading ? <><Spinner /> Signing in…</> : 'Sign in →'}
                    </button>

                    <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                            Create one free
                        </Link>
                    </p>
                </form>

                {/* Demo credentials hint */}
                <div style={{ marginTop: 28, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>🎯 Demo Login</p>
                    <p style={{ fontSize: '0.73rem', color: '#15803d', lineHeight: 1.6 }}>
                        You can register a new account or contact the admin for demo credentials.
                    </p>
                </div>
            </div>

            {/* ── Right: Marketing Panel ─────────────────────── */}
            <AuthRightPanel
                title="WhatsApp automation at your fingertips"
                subtitle="Manage conversations, track leads, run campaigns — all from one powerful workspace."
            />
        </div>
    )
}
