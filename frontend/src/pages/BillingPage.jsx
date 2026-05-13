import { useEffect, useState } from 'react'
import { billingApi } from '../api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

const FEATURES_ICON = (
  <svg style={{ width: 14, height: 14, flexShrink: 0, color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

/* ── Demo Payment Modal ─────────────────────────────── */
function PaymentModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState('form') // form | processing | success | failed
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', expiry: '12/26', cvv: '123', name: 'Demo User' })

  const pay = async () => {
    setStep('processing')
    await new Promise(r => setTimeout(r, 2000))
    try {
      await billingApi.subscribe(plan.id)
      setStep('success')
    } catch {
      setStep('failed')
    }
  }

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', padding: '20px 24px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 2 }}>Subscribing to</p>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{plan.name} Plan</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.6rem', fontWeight: 800 }}>{fmt(plan.price_monthly)}</p>
              <p style={{ fontSize: '0.72rem', opacity: 0.8 }}>/month</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'form' && (
            <>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.78rem', color: '#92400e' }}>
                🧪 <strong>Demo Mode</strong> — No real payment. Card is pre-filled.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['Card Number', 'number', '4242 4242 4242 4242'], ['Cardholder Name', 'name', 'Demo User']].map(([label, key, ph]) => (
                  <div key={key}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</p>
                    <input style={inp} value={card[key]} onChange={e => setCard(c => ({ ...c, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Expiry', 'expiry', '12/26'], ['CVV', 'cvv', '123']].map(([label, key, ph]) => (
                    <div key={key}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</p>
                      <input style={inp} value={card[key]} onChange={e => setCard(c => ({ ...c, [key]: e.target.value }))} placeholder={ph} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Cancel</button>
                <button onClick={pay} style={{ flex: 2, padding: '11px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Pay {fmt(plan.price_monthly)}</button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 52, height: 52, border: '4px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 600, color: '#111827' }}>Processing payment…</p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>Please wait</p>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 28, height: 28, color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 6 }}>Payment Successful!</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 20 }}>{plan.name} plan is now active.</p>
              <button onClick={() => { onSuccess(); onClose() }} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Done</button>
            </div>
          )}

          {step === 'failed' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg style={{ width: 28, height: 28, color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 6 }}>Payment Failed</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 20 }}>Something went wrong. Please try again.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setStep('form')} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Try Again</button>
                <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Plan Card ──────────────────────────────────────── */
function PlanCard({ plan, isCurrent, onUpgrade }) {
  const isEnterprise = plan.plan_type === 'ENTERPRISE'
  const accent = plan.is_popular ? '#2563eb' : '#374151'
  const navigate = useNavigate()

  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: plan.is_popular ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
      padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 0,
      position: 'relative', boxShadow: plan.is_popular ? '0 8px 32px rgba(37,99,235,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s',
    }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
    >
      {plan.is_popular && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 14px', borderRadius: 99, letterSpacing: '0.08em' }}>
          MOST POPULAR
        </div>
      )}

      {/* Name + tagline */}
      <p style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>{plan.name}</p>
      <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 20, minHeight: 32 }}>{plan.description}</p>

      {/* Price */}
      <div style={{ marginBottom: 24 }}>
        {isEnterprise ? (
          <p style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>Custom</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: plan.is_popular ? '#2563eb' : '#111827', lineHeight: 1 }}>{fmt(plan.price_monthly)}</span>
            <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>/month</span>
          </div>
        )}
        {!isEnterprise && plan.price_yearly > 0 && (
          <p style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 5, fontWeight: 500 }}>
            Save {fmt(plan.price_monthly * 12 - plan.price_yearly)} with yearly billing
          </p>
        )}
      </div>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 24 }}>
        {(plan.features || []).slice(0, 6).map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {FEATURES_ICON}
            <span style={{ fontSize: '0.82rem', color: '#374151' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <button disabled style={{ width: '100%', padding: '12px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#9ca3af', fontWeight: 700, fontSize: '0.875rem', cursor: 'default' }}>
          ✓ Current Plan
        </button>
      ) : isEnterprise ? (
        <button onClick={() => window.open('mailto:sales@chatflow360.com', '_blank')} style={{ width: '100%', padding: '12px', borderRadius: 9, border: '1.5px solid #374151', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
          Contact Us →
        </button>
      ) : (
        <button onClick={() => onUpgrade(plan)} style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: plan.is_popular ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)' : '#111827', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: plan.is_popular ? '0 4px 14px rgba(37,99,235,0.4)' : 'none' }}>
          Upgrade to {plan.name} →
        </button>
      )}
    </div>
  )
}

/* ── Invoice Row ────────────────────────────────────── */
function InvoiceRow({ tx }) {
  const STATUS = {
    COMPLETED: { bg: '#f0fdf4', color: '#16a34a', label: 'Paid' },
    PENDING: { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
    FAILED: { bg: '#fef2f2', color: '#dc2626', label: 'Failed' },
  }
  const s = STATUS[tx.status] || STATUS.PENDING
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#6b7280', fontFamily: 'monospace' }}>#{String(tx.id).slice(0, 8).toUpperCase()}</td>
      <td style={{ padding: '12px 8px', fontSize: '0.82rem', color: '#374151' }}>{new Date(tx.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
      <td style={{ padding: '12px 8px', fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>₹{Number(tx.amount).toLocaleString('en-IN')}</td>
      <td style={{ padding: '12px 8px', fontSize: '0.78rem', color: '#6b7280' }}>{tx.metadata?.plan_name || tx.metadata?.plan || 'Pro'} Plan</td>
      <td style={{ padding: '12px 20px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
      </td>
    </tr>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function BillingPage() {
  const [plans, setPlans] = useState([])
  const [sub, setSub] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [payPlan, setPayPlan] = useState(null)   // plan being purchased
  const [cancelling, setCancelling] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      billingApi.plans().then(r => setPlans(r.data.results || r.data)).catch(() => setPlans([])),
      billingApi.mySubscription().then(r => setSub(r.data)).catch(() => { }),
      billingApi.history().then(r => setHistory(r.data.results || r.data)).catch(() => setHistory([])),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onSuccess = () => {
    toast.success('Plan upgraded! 🎉')
    load()
  }

  const cancel = async () => {
    if (!window.confirm('Cancel your subscription and downgrade to Starter?')) return
    setCancelling(true)
    try {
      await billingApi.cancelSubscription()
      toast.success('Subscription cancelled.')
      load()
    } catch { toast.error('Failed to cancel.') }
    finally { setCancelling(false) }
  }

  const toggleRenew = async () => {
    try {
      const r = await billingApi.toggleAutoRenew()
      setSub(s => ({ ...s, auto_renew: r.data.auto_renew }))
      toast.success(r.data.message)
    } catch { toast.error('Failed.') }
  }

  const currentPlanType = sub?.plan?.plan_type

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1160, fontFamily: 'var(--font)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>Billing & Plans</h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>Manage your subscription and payment history</p>
      </div>

      {/* Current Plan Banner */}
      {sub && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', marginBottom: 36, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ width: 22, height: 22, color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Current Plan</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{sub.plan?.name}</p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 99, background: sub.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: sub.status === 'ACTIVE' ? '#16a34a' : '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>
                {sub.status}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {sub.next_billing_date && (
                <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                  Renews {new Date(sub.next_billing_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <button onClick={toggleRenew} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>
                Auto-renew: {sub.auto_renew ? '✓ On' : '✗ Off'}
              </button>
              {sub.plan?.plan_type !== 'STARTER' && sub.plan?.price_monthly > 0 && (
                <button onClick={cancel} disabled={cancelling} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>
                  {cancelling ? 'Cancelling…' : 'Cancel Plan'}
                </button>
              )}
            </div>
          </div>

          {/* Usage bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px', marginTop: 20 }}>
            {[
              { label: 'Messages this month', used: sub.messages_used_this_month || 0, max: sub.plan?.max_messages_per_month || 5000, color: '#2563eb' },
              { label: 'WhatsApp Numbers', used: sub.bots_created || 0, max: sub.plan?.max_bots || 2, color: '#7c3aed' },
            ].map(({ label, used, max, color }) => {
              const pct = max >= 999999 ? 5 : Math.min((used / max) * 100, 100)
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>{used.toLocaleString('en-IN')} / {max >= 999999 ? '∞' : max.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 20 }}>Choose a Plan</h2>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 400, borderRadius: 16, background: 'linear-gradient(90deg,#f9fafb 25%,#f3f4f6 50%,#f9fafb 75%)', backgroundSize: '200% 100%', animation: 'spin 1.4s linear infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 40 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlanType === plan.plan_type}
              onUpgrade={setPayPlan}
            />
          ))}
        </div>
      )}

      {/* Invoice History */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 16 }}>Payment History</h2>
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <svg style={{ width: 36, height: 36, color: '#d1d5db', margin: '0 auto 10px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No payment history yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #f3f4f6', background: '#fafafa' }}>
                  {['Invoice #', 'Date', 'Amount', 'Plan', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{history.map(tx => <InvoiceRow key={tx.id} tx={tx} />)}</tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {payPlan && (
        <PaymentModal
          plan={payPlan}
          onClose={() => setPayPlan(null)}
          onSuccess={onSuccess}
        />
      )}
    </div>
  )
}
