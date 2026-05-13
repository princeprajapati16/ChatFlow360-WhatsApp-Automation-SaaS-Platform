import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api'
import toast from 'react-hot-toast'

function Logo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [focused, setFocused] = useState(false)

    const validate = () => {
        if (!email.trim()) return 'Email address is required.'
        if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address.'
        return ''
    }

    const handle = async (e) => {
        e.preventDefault()
        const err = validate()
        if (err) { setError(err); return }
        setError('')
        setLoading(true)
        try {
            await authApi.forgotPassword(email.trim().toLowerCase())
            setSent(true)
            toast.success('Reset link sent! Check your inbox.', { duration: 5000 })
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.field_message || 'Something went wrong. Please try again.'
            if (msg.toLowerCase().includes('email')) setError(msg)
            else toast.error(msg)
        } finally { setLoading(false) }
    }

    const borderColor = error ? '#fca5a5' : focused ? '#93c5fd' : '#e4e1db'
    const shadow = error ? '0 0 0 3px rgba(220,38,38,0.1)' : focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none'

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #eff6ff 0%, #f5f3ff 50%, #f0fdf4 100%)', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                <Logo />

                <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 18, padding: '36px 36px', boxShadow: '0 16px 48px rgba(0,0,0,0.08)' }}>

                    {!sent ? (
                        <>
                            {/* Icon */}
                            <div style={{ width: 54, height: 54, borderRadius: 14, background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
                                <svg style={{ width: 26, height: 26, color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>

                            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.025em' }}>
                                Forgot your password?
                            </h1>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
                                No worries! Enter your email and we'll send you a reset link that expires in <strong>15 minutes</strong>.
                            </p>

                            <form onSubmit={handle} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: error ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                        Email address <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="email" value={email}
                                        onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                                        placeholder="you@company.com"
                                        autoComplete="email" autoFocus
                                        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                                        style={{
                                            width: '100%', padding: '11px 14px', fontSize: '0.9rem',
                                            border: `1.5px solid ${borderColor}`, borderRadius: 10,
                                            outline: 'none', fontFamily: 'var(--font)',
                                            boxShadow: shadow, background: error ? '#fff5f5' : '#fff',
                                            transition: 'all 0.15s',
                                        }}
                                    />
                                    {error && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                                            <svg style={{ width: 12, height: 12, color: '#dc2626', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                                            <p style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 500 }}>{error}</p>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={loading || !email.trim()}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px', background: (loading || !email.trim()) ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        cursor: (loading || !email.trim()) ? 'not-allowed' : 'pointer',
                                        fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font)',
                                        boxShadow: '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.2s',
                                    }}>
                                    {loading ? <><Spinner /> Sending…</> : '📧 Send Reset Link'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── Success State ─────────────────────────────── */
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: 68, height: 68, margin: '0 auto 22px' }}>
                                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg style={{ width: 30, height: 30, color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg style={{ width: 12, height: 12, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>

                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Check your inbox!</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                                We sent a password reset link to{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                                It expires in <strong>15 minutes</strong>.
                            </p>

                            <div style={{ background: '#f9f8f6', borderRadius: 10, border: '1px solid #e4e1db', padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 22, textAlign: 'left' }}>
                                <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>💡 Didn't receive it?</p>
                                <ul style={{ paddingLeft: 16, lineHeight: 1.9 }}>
                                    <li>Check your spam/junk folder</li>
                                    <li>Make sure <strong>{email}</strong> is correct</li>
                                    <li>Wait 1–2 minutes then try again</li>
                                </ul>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => { setSent(false); setEmail('') }}
                                    style={{ flex: 1, padding: '10px', background: '#f5f4f0', color: 'var(--text-secondary)', border: '1px solid #e4e1db', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                    ← Try again
                                </button>
                                <button onClick={handle} disabled={loading}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                    {loading ? <Spinner /> : '↺'} Resend
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #f0eeea', marginTop: 24, paddingTop: 18, textAlign: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
