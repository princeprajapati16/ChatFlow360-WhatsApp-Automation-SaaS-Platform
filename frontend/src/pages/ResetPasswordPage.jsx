import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

function FieldError({ msg }) {
    if (!msg) return null
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <svg style={{ width: 12, height: 12, color: '#dc2626', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            <p style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 500 }}>{msg}</p>
        </div>
    )
}

function pwStrength(pw) {
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
}
const STRENGTH = [null, { label: 'Weak', color: '#dc2626' }, { label: 'Fair', color: '#d97706' }, { label: 'Good', color: '#2563eb' }, { label: 'Strong', color: '#16a34a' }]

export default function ResetPasswordPage() {
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()

    const [form, setForm] = useState({ new_password: '', confirm_password: '' })
    const [errors, setErrors] = useState({})
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [countdown, setCountdown] = useState(5)

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }))
        if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
    }

    const strength = pwStrength(form.new_password)
    const match = form.new_password && form.confirm_password && form.new_password === form.confirm_password
    const strengthInfo = STRENGTH[strength]

    // Redirect if no token
    useEffect(() => {
        if (!token) {
            toast.error('Invalid or missing reset link. Please request a new one.', { duration: 5000 })
            navigate('/forgot-password', { replace: true })
        }
    }, [token, navigate])

    // Auto-redirect countdown after success
    useEffect(() => {
        if (!done) return
        if (countdown <= 0) { navigate('/login', { replace: true }); return }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [done, countdown, navigate])

    const validate = () => {
        const errs = {}
        if (!form.new_password) errs.new_password = 'New password is required.'
        else if (form.new_password.length < 8) errs.new_password = 'Password must be at least 8 characters.'
        if (!form.confirm_password) errs.confirm_password = 'Please confirm your password.'
        else if (form.new_password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.'
        return errs
    }

    const handle = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        setLoading(true)
        setErrors({})
        try {
            await authApi.resetPassword({
                token,
                new_password: form.new_password,
                confirm_password: form.confirm_password,
            })
            setDone(true)
            toast.success('Password reset successfully! Redirecting to login…', { duration: 4000 })
        } catch (err) {
            const resData = err?.response?.data
            if (resData?.field && resData?.message) {
                if (resData.field === 'token') {
                    // Token invalid/expired
                    toast.error(resData.message, { duration: 6000 })
                    setTimeout(() => navigate('/forgot-password'), 2500)
                } else {
                    setErrors({ [resData.field]: resData.message })
                }
            } else {
                const msg = resData?.detail || resData?.error || 'Reset failed. The link may have expired.'
                toast.error(msg, { duration: 5000 })
                if (msg.toLowerCase().includes('expire') || msg.toLowerCase().includes('invalid')) {
                    setTimeout(() => navigate('/forgot-password'), 2500)
                }
            }
        } finally { setLoading(false) }
    }

    const requirements = [
        [form.new_password.length >= 8, 'At least 8 characters'],
        [/[A-Z]/.test(form.new_password), 'One uppercase letter'],
        [/[0-9]/.test(form.new_password), 'One number'],
        [/[^A-Za-z0-9]/.test(form.new_password), 'One special character'],
    ]

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #eff6ff 0%, #f5f3ff 50%, #f0fdf4 100%)', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <Logo />

                <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 18, padding: '36px', boxShadow: '0 16px 48px rgba(0,0,0,0.08)' }}>

                    {!done ? (
                        <>
                            <div style={{ width: 54, height: 54, borderRadius: 14, background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px' }}>
                                <svg style={{ width: 26, height: 26, color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>

                            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.025em' }}>
                                Set new password
                            </h1>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
                                Choose a strong password to keep your account secure.
                            </p>

                            <form onSubmit={handle} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* New Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors.new_password ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                        New Password <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPw ? 'text' : 'password'} value={form.new_password}
                                            onChange={e => set('new_password', e.target.value)}
                                            placeholder="Min. 8 characters" autoComplete="new-password" autoFocus
                                            style={{
                                                width: '100%', padding: '11px 42px 11px 14px', fontSize: '0.9rem',
                                                border: `1.5px solid ${errors.new_password ? '#fca5a5' : '#e4e1db'}`,
                                                borderRadius: 10, outline: 'none', fontFamily: 'var(--font)',
                                                background: errors.new_password ? '#fff5f5' : '#fff',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                            onBlur={e => { e.target.style.borderColor = errors.new_password ? '#fca5a5' : '#e4e1db'; e.target.style.boxShadow = 'none' }}
                                        />
                                        <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)}
                                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                                            {showPw
                                                ? <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            }
                                        </button>
                                    </div>
                                    <FieldError msg={errors.new_password} />
                                    {form.new_password && !errors.new_password && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= strength ? strengthInfo?.color : '#e4e1db', transition: 'background 0.3s' }} />
                                                ))}
                                            </div>
                                            <p style={{ fontSize: '0.7rem', color: strengthInfo?.color, fontWeight: 700 }}>{strengthInfo?.label} password</p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors.confirm_password ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                        Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="password" value={form.confirm_password}
                                        onChange={e => set('confirm_password', e.target.value)}
                                        placeholder="Re-enter password" autoComplete="new-password"
                                        style={{
                                            width: '100%', padding: '11px 14px', fontSize: '0.9rem',
                                            border: `1.5px solid ${form.confirm_password ? (match ? '#bbf7d0' : '#fca5a5') : (errors.confirm_password ? '#fca5a5' : '#e4e1db')}`,
                                            borderRadius: 10, outline: 'none', fontFamily: 'var(--font)', background: '#fff',
                                        }}
                                        onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                        onBlur={e => { e.target.style.boxShadow = 'none' }}
                                    />
                                    <FieldError msg={errors.confirm_password} />
                                    {form.confirm_password && !errors.confirm_password && (
                                        <p style={{ fontSize: '0.7rem', marginTop: 4, color: match ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                            {match ? '✓ Passwords match' : '✗ Passwords do not match'}
                                        </p>
                                    )}
                                </div>

                                {/* Requirements checklist */}
                                <div style={{ background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 10, padding: '12px 14px' }}>
                                    <p style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Password requirements:</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                                        {requirements.map(([ok, label]) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ color: ok ? '#16a34a' : '#d1d5db', fontSize: '0.75rem', fontWeight: 700 }}>{ok ? '✓' : '○'}</span>
                                                <span style={{ fontSize: '0.72rem', color: ok ? '#16a34a' : 'var(--text-muted)', fontWeight: ok ? 500 : 400 }}>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px', marginTop: 4,
                                        background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font)',
                                        boxShadow: '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.2s',
                                    }}>
                                    {loading ? <><Spinner /> Resetting…</> : '🔒 Reset Password'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── Success State ─────────────────────────────── */
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 24px' }}>
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.4s ease' }}>
                                    <svg style={{ width: 34, height: 34, color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                            </div>

                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Password reset! 🎉</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                                Your password has been updated successfully. All existing sessions have been invalidated.
                            </p>

                            {/* Countdown */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', border: `3px solid #2563eb`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>
                                    {countdown}
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Redirecting to login…</p>
                            </div>

                            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                                Sign in now →
                            </Link>
                        </div>
                    )}

                    {!done && (
                        <div style={{ borderTop: '1px solid #f0eeea', marginTop: 24, paddingTop: 18, textAlign: 'center' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Request a new reset link
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes popIn { 0%{transform:scale(0.6);opacity:0} 80%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }`}</style>
        </div>
    )
}
