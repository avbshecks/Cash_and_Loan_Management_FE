'use client';

import { useState, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Users, Plus, X, Loader2, KeyRound, UserX, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import api from '@/lib/api';
import { SystemUser, Role } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getStoredUser } from '@/lib/auth';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);
  const currentUser = getStoredUser();

  const { data: users = [], isLoading } = useQuery<SystemUser[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  // Only admins should see this page
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Access denied. Admin role required.</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="User Management" subtitle="Create and manage system users" />

      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 w-64" />
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          <Plus size={16} /> Create User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" sub="Create the first user account" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['User', 'Username', 'Role', 'Password Status', 'Account', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm flex-shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.fullName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{u.role.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.mustChangePassword ? (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full w-fit">
                          <AlertTriangle size={11} /> Must Change
                        </span>
                      ) : u.passwordExpired ? (
                        <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full w-fit">
                          <AlertTriangle size={11} /> Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full w-fit">
                          <CheckCircle size={11} /> OK
                          {u.passwordChangedAt && (
                            <span className="text-slate-400 ml-1">
                              {Math.floor((Date.now() - new Date(u.passwordChangedAt).getTime()) / 86400000)}d ago
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="text-xs text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full font-medium">Active</span>
                        : <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setResetTarget(u)}
                          className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md hover:bg-amber-100 transition font-medium">
                          <KeyRound size={11} /> Reset Pwd
                        </button>
                        {u.isActive && u.username !== 'admin' && (
                          <button onClick={() => {
                            if (confirm(`Deactivate ${u.fullName}?`)) deactivate.mutate(u.id);
                          }}
                            className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-md hover:bg-red-100 transition font-medium">
                            <UserX size={11} /> Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} qc={qc} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} qc={qc} />}
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const { register, handleSubmit, formState: { errors } } = useForm<{
    username: string; fullName: string; email: string; phone: string;
    roleId: number; defaultPassword: string;
  }>();
  const [err, setErr] = useState('');

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/users/roles').then(r => r.data),
  });

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/users', { ...d, roleId: Number(d.roleId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed to create user'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Create New User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800">
            The user will be required to change their password on first login.
          </div>

          <MField label="Full Name"        {...register('fullName', { required: true })} placeholder="John Smith" />
          <MField label="Username"         {...register('username', { required: true })} placeholder="jsmith" />
          <MField label="Email"            {...register('email', { required: true })}    placeholder="jsmith@mine.local" type="email" />
          <MField label="Phone"            {...register('phone', { required: true })}    placeholder="0977000000" />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select {...register('roleId', { required: true })}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="">Select a role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.description}</option>)}
            </select>
          </div>

          <MField label="Default Password" {...register('defaultPassword', { required: true, minLength: 6 })}
            type="password" placeholder="Temporary password (min 6 chars)" />

          <button onClick={handleSubmit(d => { setErr(''); mut.mutate(d); })} disabled={mut.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending ? <><Loader2 size={15} className="animate-spin" />Creating...</> : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, qc }: { user: SystemUser; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ newPassword: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: { newPassword: string }) => api.post(`/users/${user.id}/reset-password`, d),
    onSuccess: (res) => { setOk(res.data.message); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Reset Password</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Reset password for <strong>{user.fullName}</strong> ({user.username})</p>
          {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} />{ok}</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
          <MField label="New Password" type="password" {...register('newPassword', { required: true, minLength: 6 })} placeholder="Temporary password" />
          <button onClick={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} disabled={mut.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending ? <><Loader2 size={15} className="animate-spin" />Resetting...</> : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

const MField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input ref={ref} {...props} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
    </div>
  )
);
MField.displayName = 'MField';
