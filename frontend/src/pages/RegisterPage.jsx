import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, orgApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

/* ── Shared ──────────────────────────────────────────────────────────── */
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
            <svg style={{ width: 12, height: 12, color: '#dc2626', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 500 }}>{msg}</p>
        </div>
    )
}

/* ── Password Strength ─────────────────────────────────────────────── */
function pwStrength(pw) {
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
}
const STRENGTH = [null, { label: 'Weak', color: '#dc2626' }, { label: 'Fair', color: '#d97706' }, { label: 'Good', color: '#2563eb' }, { label: 'Strong', color: '#16a34a' }]

/* ── Step Indicator ────────────────────────────────────────────────── */
function StepBar({ step }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: n <= step ? '#2563eb' : '#f0eeea',
                        border: `2px solid ${n <= step ? '#2563eb' : '#e4e1db'}`,
                        fontSize: '0.75rem', fontWeight: 700, color: n <= step ? '#fff' : '#9ca3af',
                        transition: 'all 0.3s',
                    }}>
                        {n < step ? '✓' : n}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: n <= step ? '#2563eb' : '#9ca3af' }}>
                        {n === 1 ? 'Your Info' : 'Workspace'}
                    </span>
                    {n < 2 && <div style={{ flex: 1, height: 1, width: 32, background: step > n ? '#2563eb' : '#e4e1db' }} />}
                </div>
            ))}
        </div>
    )
}

/* ══════════════════════════════════════════════════════════════════════
   REGISTER PAGE
══════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '',
        password: '', password_confirm: '',
        workspace_name: '',
    })
    const [errors, setErrors] = useState({})
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { setAuth, setCurrentOrg } = useAuthStore()

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }))
        if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
    }

    const strength = pwStrength(form.password)
    const pwMatch = form.password && form.password_confirm && form.password === form.password_confirm
    const strengthInfo = STRENGTH[strength]

    const validateStep1 = () => {
        const errs = {}
        if (!form.first_name.trim()) errs.first_name = 'First name is required.'
        if (!form.last_name.trim()) errs.last_name = 'Last name is required.'
        if (!form.email.trim()) errs.email = 'Email address is required.'
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Please enter a valid email address.'
        if (!form.password) errs.password = 'Password is required.'
        else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
        if (!form.password_confirm) errs.password_confirm = 'Please confirm your password.'
        else if (form.password !== form.password_confirm) errs.password_confirm = 'Passwords do not match.'
        return errs
    }

    const goNext = () => {
        const errs = validateStep1()
        if (Object.keys(errs).length) { setErrors(errs); return }
        setStep(2)
    }

    const handle = async (e) => {
        e.preventDefault()
        if (step === 1) { goNext(); return }

        const wname = form.workspace_name.trim() || `${form.first_name}'s Workspace`
        setLoading(true)
        setErrors({})

        try {
            const { data } = await authApi.register({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
                password_confirm: form.password_confirm,
                workspace_name: wname,
            })

            setAuth(data.user, data.tokens.access, data.tokens.refresh)
            if (data.org) setCurrentOrg(data.org)

            toast.success('Account created! Welcome to ChatFlow360 🎉', { duration: 4000 })
            navigate('/dashboard', { replace: true })
        } catch (err) {
            const resData = err.response?.data
            if (resData && typeof resData === 'object') {
                // Map server field errors to local state
                const mapped = {}
                Object.entries(resData).forEach(([k, v]) => {
                    const msg = Array.isArray(v) ? v[0] : (typeof v === 'string' ? v : JSON.stringify(v))
                    mapped[k] = msg
                })
                // If email error — go back to step 1
                if (mapped.email) { setStep(1); setErrors(mapped) }
                else setErrors(mapped)
                toast.error('Please fix the errors below.')
            } else {
                toast.error('Registration failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-page)' }}>

            {/* ── Left: Form ──────────────────────────────────── */}
            <div style={{
                width: 500, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '48px 52px', background: '#fff', borderRight: '1px solid var(--border)', overflowY: 'auto',
            }}>
                <div style={{ marginBottom: 28 }}>
                    <Logo />
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginTop: 28, marginBottom: 4 }}>
                        {step === 1 ? 'Create your account' : 'Name your workspace'}
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {step === 1 ? 'Start automating WhatsApp for free. No credit card required.' : "This will be your team's workspace on ChatFlow360."}
                    </p>
                </div>

                <StepBar step={step} />

                <form onSubmit={handle} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

                    {step === 1 && (
                        <>
                            {/* Name row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[['first_name', 'First name', 'John', 'given-name'], ['last_name', 'Last name', 'Smith', 'family-name']].map(([k, label, ph, ac]) => (
                                    <div key={k}>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors[k] ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                            {label} <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        <input
                                            value={form[k]} onChange={e => set(k, e.target.value)}
                                            placeholder={ph} autoComplete={ac} required
                                            style={{
                                                width: '100%', padding: '10px 14px', fontSize: '0.9rem',
                                                border: `1.5px solid ${errors[k] ? '#fca5a5' : '#e4e1db'}`, borderRadius: 10,
                                                outline: 'none', fontFamily: 'var(--font)', background: errors[k] ? '#fff5f5' : '#fff',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = errors[k] ? '#fca5a5' : '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                            onBlur={e => { e.target.style.borderColor = errors[k] ? '#fca5a5' : '#e4e1db'; e.target.style.boxShadow = 'none' }}
                                        />
                                        <FieldError msg={errors[k]} />
                                    </div>
                                ))}
                            </div>

                            {/* Email */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors.email ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                    Work email <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                    type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                    placeholder="you@company.com" autoComplete="email" required
                                    style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: `1.5px solid ${errors.email ? '#fca5a5' : '#e4e1db'}`, borderRadius: 10, outline: 'none', fontFamily: 'var(--font)', background: errors.email ? '#fff5f5' : '#fff' }}
                                    onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = errors.email ? '#fca5a5' : '#e4e1db'; e.target.style.boxShadow = 'none' }}
                                />
                                <FieldError msg={errors.email} />
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors.password ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                    Password <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                                        placeholder="Min. 8 characters" autoComplete="new-password" required
                                        style={{ width: '100%', padding: '10px 42px 10px 14px', fontSize: '0.9rem', border: `1.5px solid ${errors.password ? '#fca5a5' : '#e4e1db'}`, borderRadius: 10, outline: 'none', fontFamily: 'var(--font)', background: errors.password ? '#fff5f5' : '#fff' }}
                                        onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                        onBlur={e => { e.target.style.borderColor = errors.password ? '#fca5a5' : '#e4e1db'; e.target.style.boxShadow = 'none' }}
                                    />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                                        {showPw
                                            ? <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        }
                                    </button>
                                </div>
                                <FieldError msg={errors.password} />
                                {form.password && !errors.password && (
                                    <div style={{ marginTop: 7 }}>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= strength ? strengthInfo?.color : '#e4e1db', transition: 'background 0.3s' }} />
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.68rem', color: strengthInfo?.color, fontWeight: 700 }}>{strengthInfo?.label}</p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: errors.password_confirm ? '#dc2626' : 'var(--text-secondary)', marginBottom: 5 }}>
                                    Confirm password <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirm ? 'text' : 'password'} value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)}
                                        placeholder="Re-enter password" autoComplete="new-password" required
                                        style={{ width: '100%', padding: '10px 42px 10px 14px', fontSize: '0.9rem', border: `1.5px solid ${form.password_confirm ? (pwMatch ? '#bbf7d0' : errors.password_confirm ? '#fca5a5' : '#fca5a5') : '#e4e1db'}`, borderRadius: 10, outline: 'none', fontFamily: 'var(--font)', background: '#fff' }}
                                        onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                        onBlur={e => { e.target.style.boxShadow = 'none' }}
                                    />
                                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                                        {showConfirm
                                            ? <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            : <svg style={{ width: 17, height: 17 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        }
                                    </button>
                                </div>
                                <FieldError msg={errors.password_confirm} />
                                {form.password_confirm && !errors.password_confirm && (
                                    <p style={{ fontSize: '0.7rem', marginTop: 4, color: pwMatch ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                        {pwMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
                                Workspace name
                            </label>
                            <input
                                value={form.workspace_name} onChange={e => set('workspace_name', e.target.value)}
                                placeholder={`${form.first_name}'s Company`} autoFocus
                                style={{ width: '100%', padding: '12px 16px', fontSize: '1rem', border: '1.5px solid #e4e1db', borderRadius: 10, outline: 'none', fontFamily: 'var(--font)' }}
                                onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                                onBlur={e => { e.target.style.borderColor = '#e4e1db'; e.target.style.boxShadow = 'none' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                                This is what your team will see. You can change it later.
                            </p>

                            <div style={{ marginTop: 20, background: '#f9f8f6', border: '1px solid #e4e1db', borderRadius: 10, padding: '14px 16px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Account summary</p>
                                {[
                                    ['Name', `${form.first_name} ${form.last_name}`],
                                    ['Email', form.email],
                                    ['Plan', 'Free (upgradeable anytime)'],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{k}</span>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        {step === 2 && (
                            <button type="button" onClick={() => setStep(1)}
                                style={{ padding: '11px 20px', background: '#f5f4f0', border: '1px solid #e4e1db', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                ← Back
                            </button>
                        )}
                        <button type="submit" disabled={loading}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '11px', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                                color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font)',
                                boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s',
                            }}>
                            {loading ? <><Spinner /> Creating account…</> : step === 1 ? 'Continue →' : '🚀 Create Account'}
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                    <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        By creating an account you agree to our Terms of Service & Privacy Policy
                    </p>
                </form>
            </div>

            {/* ── Right: Marketing ──────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px', background: 'linear-gradient(145deg, #eff6ff 0%, #f5f3ff 40%, #f0fdf4 100%)' }}>
                <div style={{ maxWidth: 380, textAlign: 'center' }}>
                    <div style={{ width: 68, height: 68, borderRadius: 18, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', margin: '0 auto 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(37,99,235,0.3)' }}>
                        <svg style={{ width: 32, height: 32, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.2 }}>Everything you need to grow</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
                        Join 1,000+ businesses using ChatFlow360 to automate WhatsApp and close more deals.
                    </p>
                    {[
                        { icon: '💬', title: 'Team Inbox', desc: 'Shared inbox with real-time chat handoff' },
                        { icon: '📊', title: 'Lead Pipeline', desc: 'Visual CRM with drag & drop Kanban' },
                        { icon: '📣', title: 'Campaigns', desc: 'Broadcast to thousands with one click' },
                        { icon: '⚡', title: 'Automation', desc: 'Auto-reply, workflows and smart routing' },
                    ].map(f => (
                        <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textAlign: 'left', background: '#fff', borderRadius: 12, border: '1px solid rgba(37,99,235,0.1)', padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon}</span>
                            <div>
                                <p style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
