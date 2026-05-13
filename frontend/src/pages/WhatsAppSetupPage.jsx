import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { whatsappApi } from '../api'
import toast from 'react-hot-toast'

/* ── tiny helpers ───────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
      <path fill="currentColor" style={{ opacity: 0.9 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

/* ── Progress Bar ───────────────────────────────────────────────────── */
function ProgressBar({ step }) {
  const steps = ['Login', 'Connect WhatsApp', 'Dashboard']
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? '#22c55e' : active ? 'linear-gradient(135deg,#25d366,#128c7e)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 0 4px rgba(37,211,102,0.2)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done
                  ? <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <span style={{ fontSize: '0.8rem', fontWeight: 700, color: active ? '#fff' : '#94a3b8' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#22c55e' : active ? '#128c7e' : '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 80, height: 2, background: done ? '#22c55e' : '#e2e8f0', margin: '0 4px', marginBottom: 22, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Input Field ────────────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder, type = 'text', hint, required, rightEl }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: rightEl ? '10px 110px 10px 14px' : '10px 14px',
            fontSize: '0.875rem', border: `1.5px solid ${focused ? '#25d366' : '#e2e8f0'}`,
            borderRadius: 10, outline: 'none', background: '#fff', fontFamily: 'inherit',
            boxShadow: focused ? '0 0 0 3px rgba(37,211,102,0.15)' : 'none',
            transition: 'all 0.15s', color: '#1e293b', boxSizing: 'border-box',
          }}
        />
        {rightEl && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            {rightEl}
          </div>
        )}
      </div>
      {hint && <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

/* ── Collapsible Guide ──────────────────────────────────────────────── */
function HelpGuide() {
  const [open, setOpen] = useState(false)
  const steps = [
    'Go to developers.facebook.com and log in with your business account',
    'Click "Create App" → Select "Business" type → Choose "WhatsApp"',
    'Under WhatsApp → Getting Started, add your Business Phone Number',
    'Copy the Phone Number ID shown on the page → paste in the field above',
    'Go to System Users in Meta Business Suite → Generate a Permanent Token with whatsapp_business_messaging & whatsapp_business_management permissions',
    'Paste the permanent token in the Access Token field above',
    'Click "Generate Verify Token" → copy both the Webhook URL and Verify Token',
    'In Meta Developer Console → WhatsApp → Configuration → paste Webhook URL + Verify Token → Click Verify',
    'Click "Connect WhatsApp" ✅',
  ]
  return (
    <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', background: '#f8fafc',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
          📖 How to get Phone Number ID & Access Token
        </span>
        <svg style={{ width: 16, height: 16, color: '#64748b', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>{s}</li>
            ))}
          </ol>
          <a
            href="https://developers.facebook.com" target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: '0.78rem', color: '#25d366', fontWeight: 600, textDecoration: 'none' }}
          >
            Open Meta Developer Console →
          </a>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function WhatsAppSetupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    phone_number_id: '',
    access_token: '',
    display_phone_number: '',
    webhook_verify_token: '',
  })
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const WEBHOOK_URL = `${window.location.protocol}//${window.location.hostname}:8000/api/v1/whatsapp/webhook/`

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setError('')
  }

  const generateToken = async () => {
    setGenerating(true)
    try {
      const { data } = await whatsappApi.generateToken()
      setForm(f => ({ ...f, webhook_verify_token: data.verify_token }))
      toast.success('Verify token generated!')
    } catch {
      toast.error('Failed to generate token')
    } finally {
      setGenerating(false)
    }
  }

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleConnect = async () => {
    if (!form.phone_number_id.trim()) return setError('Phone Number ID is required.')
    if (!form.access_token.trim()) return setError('Access Token is required.')
    if (!form.display_phone_number.trim()) return setError('WhatsApp Business Number is required.')

    setLoading(true)
    setError('')
    try {
      await whatsappApi.connect({
        phone_number_id: form.phone_number_id.trim(),
        access_token: form.access_token.trim(),
        display_phone_number: form.display_phone_number.trim(),
        webhook_verify_token: form.webhook_verify_token.trim(),
        display_name: 'My WhatsApp Business',
      })
      setConnected(true)
      localStorage.setItem('whatsapp_connected', 'true')
      toast.success('WhatsApp connected successfully! 🎉')
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection failed. Check your credentials.'
      // Map common errors to user-friendly messages
      if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('phone')) {
        setError('Invalid Phone Number ID. Please check your Meta Developer Console.')
      } else if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('auth')) {
        setError('Token verification failed. Please generate a new Permanent Access Token.')
      } else if (msg.toLowerCase().includes('meta') || msg.toLowerCase().includes('service')) {
        setError('Meta service unavailable. Please try again in a few minutes.')
      } else if (msg.toLowerCase().includes('already connected') || msg.toLowerCase().includes('already')) {
        setError('A number is already connected. Disconnect it first from Settings → WhatsApp.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoConnect = async () => {
    setDemoLoading(true)
    try {
      await whatsappApi.connectDemo({ display_name: 'Demo Business', display_phone_number: '+91 98765 43210' })
      setConnected(true)
      localStorage.setItem('whatsapp_connected', 'true')
      toast.success('Demo WhatsApp connected! 🎉')
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo connect failed.')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('whatsapp_skipped', 'true')
    navigate('/dashboard', { replace: true })
  }

  /* ── Connected success screen ─────────────────────────────────────── */
  if (connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(34,197,94,0.35)' }}>
            <svg style={{ width: 40, height: 40, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginBottom: 8 }}>WhatsApp Connected! ✅</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Redirecting to your dashboard in 2 seconds…</p>
          <div style={{ marginTop: 16 }}>
            <Spinner />
          </div>
        </div>
      </div>
    )
  }

  /* ── Setup Form ───────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc 0%,#f0fdf4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,211,102,0.35)' }}>
            <svg style={{ width: 20, height: 20, color: '#fff' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.03em' }}>
            ChatFlow<span style={{ color: '#25d366' }}>360</span>
          </span>
        </div>

        {/* Progress */}
        <ProgressBar step={1} />

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#14532d', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Connect Your WhatsApp Business Number
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 500 }}>
              All customer WhatsApp messages will automatically appear in your Inbox
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Phone Number ID */}
            <Field
              label="Phone Number ID" required
              value={form.phone_number_id}
              onChange={e => set('phone_number_id', e.target.value)}
              placeholder="e.g. 123456789012345"
              hint="Found in Meta Developer Console → WhatsApp → Getting Started"
            />

            {/* Access Token */}
            <Field
              label="Permanent Access Token" required type={showToken ? 'text' : 'password'}
              value={form.access_token}
              onChange={e => set('access_token', e.target.value)}
              placeholder="EAAxxxxxxxxxxxxxxx…"
              hint="Generate a System User token with whatsapp_business_messaging permissions"
              rightEl={
                <button onClick={() => setShowToken(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, fontFamily: 'inherit', padding: '4px 8px' }}>
                  {showToken ? 'Hide' : 'Show'}
                </button>
              }
            />

            {/* WhatsApp Number */}
            <Field
              label="Your WhatsApp Business Number" required
              value={form.display_phone_number}
              onChange={e => set('display_phone_number', e.target.value)}
              placeholder="e.g. +919876543210"
              hint="International format with country code"
            />

            {/* Verify Token */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Webhook Verify Token
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" value={form.webhook_verify_token} readOnly
                  placeholder="Click Generate →"
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: '0.82rem',
                    border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none',
                    background: '#f8fafc', fontFamily: 'monospace', color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={generateToken} disabled={generating}
                  style={{
                    padding: '10px 16px', background: 'linear-gradient(135deg,#1e40af,#2563eb)',
                    color: '#fff', border: 'none', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}
                >
                  {generating ? <Spinner /> : '⚡ Generate'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Auto-generated secure token — paste this in Meta Console</p>
            </div>

            {/* Webhook URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Webhook URL <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(paste this in Meta Console)</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" value={WEBHOOK_URL} readOnly
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: '0.78rem',
                    border: '1.5px solid #e2e8f0', borderRadius: 10, outline: 'none',
                    background: '#f8fafc', fontFamily: 'monospace', color: '#64748b',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={copyWebhook}
                  style={{
                    padding: '10px 14px', background: copied ? '#22c55e' : '#f1f5f9',
                    color: copied ? '#fff' : '#475569', border: '1.5px solid #e2e8f0',
                    borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <svg style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 1 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p style={{ fontSize: '0.82rem', color: '#dc2626', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnect} disabled={loading}
              style={{
                padding: '13px', background: loading ? '#86efac' : 'linear-gradient(135deg,#25d366,#128c7e)',
                color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(37,211,102,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s', marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
            >
              {loading ? <><Spinner /> Verifying with Meta API…</> : '🔗 Connect WhatsApp'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            </div>

            {/* Demo Connect */}
            <button
              onClick={handleDemoConnect} disabled={demoLoading}
              style={{
                padding: '11px', background: 'transparent',
                color: '#475569', border: '1.5px dashed #cbd5e1', borderRadius: 12,
                cursor: demoLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'transparent' }}
            >
              {demoLoading ? <><Spinner /> Connecting demo…</> : '🧪 Use Demo Connection (for testing)'}
            </button>

            {/* Helper Guide */}
            <HelpGuide />

            {/* Skip */}
            <p style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                onClick={handleSkip}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}
              >
                Skip for now — go to Dashboard
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
