import { useState } from 'react'
import toast from 'react-hot-toast'

/* ── helpers ── */
const copy = (text) => {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied!'))
}

function CodeBlock({ code, lang = '' }) {
  return (
    <div style={{ position: 'relative', margin: '10px 0' }}>
      <pre style={{
        background: '#0d1117', color: '#e6edf3', borderRadius: 10,
        padding: '14px 16px', fontSize: '0.78rem', overflowX: 'auto',
        lineHeight: 1.7, margin: 0, border: '1px solid #30363d',
        fontFamily: '"Fira Code", "Cascadia Code", monospace',
      }}><code>{code}</code></pre>
      <button
        onClick={() => copy(code)}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: '#21262d', border: '1px solid #30363d',
          color: '#8b949e', borderRadius: 6, padding: '3px 8px',
          cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e6edf3'}
        onMouseLeave={e => e.currentTarget.style.color = '#8b949e'}
      >Copy</button>
    </div>
  )
}

function Step({ number, title, done, onClick, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: done ? '1.5px solid #22c55e33' : '1.5px solid #e5e7eb',
      borderRadius: 14, overflow: 'hidden', marginBottom: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', background: done ? '#f0fdf4' : '#fff',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: done ? '#22c55e' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.85rem', fontWeight: 700,
        }}>
          {done ? '✓' : number}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', margin: 0 }}>{title}</p>
        </div>
        <svg style={{ width: 16, height: 16, color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', background: '#fff', borderTop: '1px solid #f3f4f6' }}>
          {children}
          <button
            onClick={() => { onClick?.(); setOpen(false) }}
            style={{
              marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none',
              background: done ? '#dcfce7' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
              color: done ? '#16a34a' : '#fff', fontWeight: 700, cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >{done ? '✓ Completed' : 'Mark as Done'}</button>
        </div>
      )}
    </div>
  )
}

function PlatformCard({ name, badge, icon, color, description, onClick, selected }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        border: selected ? `2px solid ${color}` : '1.5px solid #e5e7eb',
        background: selected ? `${color}08` : '#fff',
        boxShadow: selected ? `0 4px 20px ${color}22` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontWeight: 800, color: '#111827', fontSize: '1rem' }}>{name}</span>
        <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 99, background: `${color}18`, color, fontWeight: 700 }}>{badge}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{description}</p>
    </button>
  )
}

const VERCEL_ENV = `VITE_API_URL=https://YOUR-BACKEND-URL.railway.app`

const RAILWAY_ENV = `SECRET_KEY=your-super-secret-django-key-50-chars-min
DEBUG=False
ALLOWED_HOSTS=.railway.app,.up.railway.app
DATABASE_URL=postgresql://... (Railway auto-fills this)
REDIS_URL=redis://... (Railway auto-fills this)
CELERY_BROKER_URL=redis://... (same as REDIS_URL)
CELERY_RESULT_BACKEND=redis://... (same as REDIS_URL)
CORS_ALLOWED_ORIGINS=https://YOUR-APP.vercel.app
FRONTEND_URL=https://YOUR-APP.vercel.app
WHATSAPP_VERIFY_TOKEN=chatflow360_verify
STRIPE_SECRET_KEY=sk_live_...
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_app_password`

const RENDER_ENV = `SECRET_KEY=your-super-secret-key
DEBUG=False
ALLOWED_HOSTS=.onrender.com
CORS_ALLOWED_ORIGINS=https://YOUR-APP.vercel.app
FRONTEND_URL=https://YOUR-APP.vercel.app`

const VITE_CONFIG = `// frontend/vite.config.js  (update for production)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: import.meta.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})`

export default function DeployPage() {
  const [backendPlatform, setBackendPlatform] = useState('railway') // 'railway' | 'render'
  const [steps, setSteps] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false })
  const done = (n) => setSteps(s => ({ ...s, [n]: !s[n] }))
  const totalDone = Object.values(steps).filter(Boolean).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 860, fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: 18, height: 18, color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>Deployment Hub</h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: 16 }}>Deploy ChatFlow360 frontend to Vercel + backend to your chosen platform.</p>

        {/* Progress bar */}
        <div style={{ background: '#f3f4f6', borderRadius: 99, height: 6, marginBottom: 8 }}>
          <div style={{ width: `${(totalDone / 6) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{totalDone} of 6 steps completed</p>
      </div>

      {/* Architecture diagram */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', borderRadius: 16, padding: '20px 24px', marginBottom: 28, color: '#fff' }}>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Architecture Overview</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'React Frontend', sub: 'Vercel CDN', color: '#60a5fa', icon: '▲' },
            { label: '→', color: '#475569' },
            { label: 'Django REST API', sub: 'Railway / Render', color: '#a78bfa', icon: '🐍' },
            { label: '→', color: '#475569' },
            { label: 'PostgreSQL', sub: 'Managed DB', color: '#34d399', icon: '🗄️' },
            { label: '+', color: '#475569' },
            { label: 'Redis', sub: 'Cache + Celery', color: '#fb923c', icon: '⚡' },
          ].map((item, i) => (
            item.label === '→' || item.label === '+' ? (
              <span key={i} style={{ color: item.color, fontSize: '1.2rem', fontWeight: 300 }}>{item.label}</span>
            ) : (
              <div key={i} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', border: `1px solid ${item.color}33` }}>
                <p style={{ color: item.color, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>{item.icon} {item.label}</p>
                <p style={{ color: '#64748b', fontSize: '0.68rem', margin: 0 }}>{item.sub}</p>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Backend Platform Selector */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Choose Backend Platform</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <PlatformCard
            name="Railway" badge="Recommended" icon="🚂" color="#7c3aed"
            description="One-click deploys, auto DB + Redis, free tier. Best DX."
            selected={backendPlatform === 'railway'} onClick={() => setBackendPlatform('railway')}
          />
          <PlatformCard
            name="Render" badge="Free" icon="🎨" color="#2563eb"
            description="Blueprint YAML deploy. Good free tier with auto-SSL."
            selected={backendPlatform === 'render'} onClick={() => setBackendPlatform('render')}
          />
        </div>
      </div>

      {/* Steps */}
      <Step number={1} title="Prepare Frontend – Set API URL" done={steps[1]} onClick={() => done(1)}>
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
          In your Vercel project settings, add this environment variable so the frontend knows where your backend lives:
        </p>
        <CodeBlock code={VERCEL_ENV} />
        <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 8 }}>
          ⚠️ Replace <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>YOUR-BACKEND-URL</code> after you deploy the backend in step 3.
        </p>
      </Step>

      <Step number={2} title="Deploy Frontend → Vercel" done={steps[2]} onClick={() => done(2)}>
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
          Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>vercel.com/new</a>, import your GitHub repo, then set:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0', fontSize: '0.82rem' }}>
          {[
            ['Root Directory', 'frontend'],
            ['Framework Preset', 'Vite'],
            ['Build Command', 'npm run build'],
            ['Output Directory', 'dist'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.68rem', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>{k}</p>
              <code style={{ color: '#111827', fontWeight: 700 }}>{v}</code>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', margin: '8px 0 0' }}>
          ✓ The <code>vercel.json</code> file is already configured in your repo root — Vercel will auto-detect it.
        </p>
      </Step>

      <Step number={3} title={`Deploy Backend → ${backendPlatform === 'railway' ? 'Railway' : 'Render'}`} done={steps[3]} onClick={() => done(3)}>
        {backendPlatform === 'railway' ? (
          <>
            <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
              Go to <a href="https://railway.app/new" target="_blank" rel="noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>railway.app/new</a> → <strong>Deploy from GitHub Repo</strong> → select your repo.
            </p>
            <ol style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.9, paddingLeft: 18, margin: '10px 0' }}>
              <li>Set <strong>Root Directory</strong> to <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>/</code> (repo root)</li>
              <li>Add a <strong>PostgreSQL</strong> plugin from the Railway dashboard</li>
              <li>Add a <strong>Redis</strong> plugin from the Railway dashboard</li>
              <li>Railway auto-injects <code>DATABASE_URL</code> and <code>REDIS_URL</code></li>
              <li>The <code>railway.toml</code> in your repo handles build + start commands</li>
            </ol>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
              Go to <a href="https://dashboard.render.com/new/blueprint" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>render.com → New Blueprint</a> and connect your repo. The <code>render.yaml</code> in your repo auto-provisions Postgres + Redis.
            </p>
          </>
        )}
      </Step>

      <Step number={4} title="Set Backend Environment Variables" done={steps[4]} onClick={() => done(4)}>
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
          In your {backendPlatform === 'railway' ? 'Railway' : 'Render'} service → <strong>Variables</strong> tab, add:
        </p>
        <CodeBlock code={backendPlatform === 'railway' ? RAILWAY_ENV : RENDER_ENV} />
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#92400e', marginTop: 8 }}>
          ⚠️ <strong>Never</strong> commit real secrets. Use the platform's secrets manager. Generate a new <code>SECRET_KEY</code> with:<br />
          <code>python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"</code>
        </div>
      </Step>

      <Step number={5} title="Update CORS + Vercel Environment" done={steps[5]} onClick={() => done(5)}>
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
          Once your backend is live, go back to your <strong>Vercel project → Settings → Environment Variables</strong> and update:
        </p>
        <CodeBlock code={`VITE_API_URL=https://YOUR-ACTUAL-BACKEND-DOMAIN.railway.app`} />
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 10 }}>
          And in the backend env vars, update <code>CORS_ALLOWED_ORIGINS</code> and <code>FRONTEND_URL</code> to your real Vercel URL, then redeploy both.
        </p>
      </Step>

      <Step number={6} title="Run Migrations & Seed Data" done={steps[6]} onClick={() => done(6)}>
        <p style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.6, marginTop: 12 }}>
          The <code>railway.toml</code> / <code>render.yaml</code> already run migrations on deploy. To manually run admin commands, use the platform's shell:
        </p>
        <CodeBlock code={`# Create superuser
python manage.py createsuperuser

# Seed subscription plans
python seed_plans.py

# Collect static files
python manage.py collectstatic --noinput`} />
      </Step>

      {/* Final status banner */}
      {totalDone === 6 && (
        <div style={{
          background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: 14,
          padding: '20px 24px', color: '#fff', marginTop: 8, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: '2rem' }}>🎉</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>All steps complete!</p>
            <p style={{ fontSize: '0.83rem', opacity: 0.85, margin: '4px 0 0' }}>ChatFlow360 is deployed. Visit your Vercel URL to test the full production app.</p>
          </div>
        </div>
      )}

      {/* Quick reference */}
      <div style={{ marginTop: 28, background: '#f9fafb', borderRadius: 14, padding: '20px 24px', border: '1.5px solid #e5e7eb' }}>
        <p style={{ fontWeight: 700, color: '#111827', marginBottom: 14, fontSize: '0.875rem' }}>📋 Quick Reference</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Frontend', value: 'Vercel → /frontend dir', link: 'https://vercel.com' },
            { label: 'Backend', value: backendPlatform === 'railway' ? 'Railway → repo root' : 'Render → blueprint', link: backendPlatform === 'railway' ? 'https://railway.app' : 'https://render.com' },
            { label: 'Config Files', value: 'vercel.json + railway.toml', link: null },
            { label: 'Health Check', value: '/api/health/', link: null },
          ].map(({ label, value, link }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>{label}</p>
              {link ? (
                <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600 }}>{value} ↗</a>
              ) : (
                <code style={{ fontSize: '0.78rem', color: '#374151' }}>{value}</code>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
