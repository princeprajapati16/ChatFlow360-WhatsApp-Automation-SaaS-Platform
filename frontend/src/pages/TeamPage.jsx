import { useEffect, useState } from 'react'
import { orgApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

const ROLE_BADGE = {
    SUPER_ADMIN: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    BUSINESS_ADMIN: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    AGENT: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
}

export default function TeamPage() {
    const { currentOrg } = useAuthStore()
    const [members, setMembers] = useState([])
    const [showInvite, setShowInvite] = useState(false)
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'AGENT' })
    const [loading, setLoading] = useState(false)

    const load = () => {
        if (!currentOrg) return
        orgApi.members(currentOrg.id).then((r) => setMembers(r.data || [])).catch(() => { })
    }
    useEffect(() => { load() }, [currentOrg])

    const invite = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await orgApi.invite(currentOrg.id, inviteForm)
            toast.success(`Invited ${inviteForm.email}`)
            setShowInvite(false)
            setInviteForm({ email: '', role: 'AGENT' })
            load()
        } catch (err) {
            const msg = err.response?.data?.errors?.email?.[0] || 'Failed to invite'
            toast.error(msg)
        } finally { setLoading(false) }
    }

    const remove = async (memberId) => {
        try {
            await orgApi.removeMember(currentOrg.id, memberId)
            toast.success('Member removed')
            load()
        } catch { toast.error('Failed to remove') }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Team Management</h1>
                    <p className="text-slate-400 text-sm">{currentOrg?.name} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowInvite(true)} className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    Invite Member
                </button>
            </div>

            {/* Members Table */}
            <div className="card overflow-hidden">
                <table className="w-full">
                    <thead className="border-b border-slate-800">
                        <tr>
                            {['Member', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                                <th key={h} className="text-left text-xs text-slate-500 font-medium py-3.5 px-5 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {members.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-500">No team members</td></tr>
                        ) : (
                            members.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                                {(m.user_name || m.user_email || '?')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{m.user_name || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500">{m.user_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <span className={`badge border text-xs ${ROLE_BADGE[m.role] || ROLE_BADGE.AGENT}`}>{m.role.replace('_', ' ')}</span>
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <span className={`badge border text-xs ${m.is_active ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                                            {m.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <button onClick={() => remove(m.id)} className="btn-danger text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {showInvite && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-white">Invite Team Member</h2>
                            <button onClick={() => setShowInvite(false)} className="text-slate-500 hover:text-slate-300">✕</button>
                        </div>
                        <form onSubmit={invite} className="space-y-4">
                            <div>
                                <label className="label">Email address</label>
                                <input className="input" type="email" placeholder="agent@company.com" value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
                                <p className="text-xs text-slate-600 mt-1">User must already have a ChatFlow360 account</p>
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <select className="input" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
                                    <option value="AGENT">Agent</option>
                                    <option value="BUSINESS_ADMIN">Business Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                                <p>🔵 <strong className="text-slate-400">Agent</strong> — Reply to chats, manage leads</p>
                                <p>🟣 <strong className="text-slate-400">Business Admin</strong> — Manage team, automation, campaigns</p>
                                <p>🟡 <strong className="text-slate-400">Super Admin</strong> — Full access including billing</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                                <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
                                    {loading ? 'Inviting...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
