'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ShieldOff, ShieldCheck, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { BlacklistedBorrower } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getStoredUser } from '@/lib/auth';

export default function BlacklistedPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<BlacklistedBorrower | null>(null);
  const isAdmin = getStoredUser()?.role === 'Admin';

  const { data: list = [], isLoading } = useQuery<BlacklistedBorrower[]>({
    queryKey: ['blacklisted'],
    queryFn: () => api.get('/loan/blacklisted').then(r => r.data),
  });

  return (
    <div>
      <Header title="Blacklisted Borrowers" subtitle={`${list.length} borrower(s) blocked`} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : list.length === 0 ? (
          <EmptyState icon={ShieldOff} title="No blacklisted borrowers" sub="Clean record — no defaults" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'National ID', 'Phone', 'Reason', 'Blacklisted On', 'By', ...(isAdmin ? ['Action'] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(b => (
                  <tr key={b.borrowerId} className="hover:bg-red-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{b.nationalId}</td>
                    <td className="px-4 py-3 text-slate-600">{b.phone}</td>
                    <td className="px-4 py-3 text-red-700 max-w-xs truncate">{b.blacklistedReason}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.blacklistedAt ? new Date(b.blacklistedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.blacklistedBy}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => setTarget(b)}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-md hover:bg-green-200 transition font-medium">
                          <ShieldCheck size={12} /> Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {target && <RemoveBlacklistModal borrower={target} onClose={() => setTarget(null)} qc={qc} />}
    </div>
  );
}

function RemoveBlacklistModal({ borrower, onClose, qc }: { borrower: BlacklistedBorrower; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ reason: string }>();
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: { reason: string }) =>
      api.post(`/loan/borrowers/${borrower.borrowerId}/remove-blacklist`, d.reason, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blacklisted'] }); qc.invalidateQueries({ queryKey: ['borrowers'] }); onClose(); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Remove from Blacklist</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d); })}>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            Reinstate <strong>{borrower.name}</strong>? They will be eligible for new loans again.
          </div>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for removal</label>
            <textarea {...register('reason', { required: true })} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
          <button type="submit" disabled={mut.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Removing…</> : <><ShieldCheck size={15} /> Remove from Blacklist</>}
          </button>
        </form>
      </div>
    </div>
  );
}
