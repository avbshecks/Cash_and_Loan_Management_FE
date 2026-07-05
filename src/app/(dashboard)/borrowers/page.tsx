'use client';

import { useState, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Users, Plus, X, Loader2, Search, ShieldOff } from 'lucide-react';
import api from '@/lib/api';
import { Borrower, CreateBorrowerRequest } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getStoredUser } from '@/lib/auth';
import { canEntry } from '@/lib/permissions';

export default function BorrowersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: borrowers = [], isLoading } = useQuery<Borrower[]>({
    queryKey: ['borrowers'],
    queryFn: () => api.get('/loan/borrowers').then(r => r.data).catch(() => []),
  });

  const filtered = borrowers.filter(b =>
    b.fullName.toLowerCase().includes(search.toLowerCase()) ||
    b.nationalId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Borrowers" subtitle="Registered borrower directory" />

      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or national ID..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 w-72"
          />
        </div>
        {canEntry(getStoredUser()?.role) && <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Register Borrower
        </button>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No borrowers found" sub="Register a borrower to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['ID', 'Full Name', 'National ID', 'Phone', 'Employment', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <tr key={b.id} className={`hover:bg-slate-50 transition ${b.isBlacklisted ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-slate-500 text-xs">#{b.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{b.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.nationalId}</td>
                    <td className="px-4 py-3 text-slate-600">{b.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{b.employmentStatus}</td>
                    <td className="px-4 py-3">
                      {b.isBlacklisted ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full w-fit">
                          <ShieldOff size={11} /> Blacklisted
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <RegisterBorrowerModal onClose={() => setShowCreate(false)} qc={qc} />}
    </div>
  );
}

function RegisterBorrowerModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<CreateBorrowerRequest>();
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: CreateBorrowerRequest) => api.post('/loan/borrower', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['borrowers'] }); onClose(); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed to register borrower'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Register New Borrower</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d); })} className="space-y-4">
            {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
            <MField label="Full Name" {...register('fullName', { required: true })} placeholder="As on national ID" />
            <MField label="National ID" {...register('nationalId', { required: true })} placeholder="e.g. NRC123456/10/1" />
            <MField label="Phone Number" {...register('phone', { required: true })} placeholder="e.g. 0977000000" />
            <MField label="Address" {...register('address', { required: true })} placeholder="Residential address" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Employment Status</label>
              <select
                {...register('employmentStatus', { required: true })}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition bg-white"
              >
                <option value="">Select status</option>
                <option>Employed</option>
                <option>Self-employed</option>
                <option>Contract Worker</option>
                <option>Unemployed</option>
              </select>
            </div>
            <MField label="Guarantor Details (optional)" {...register('guarantorDetails')} placeholder="Guarantor name and contact" />
            <button type="submit" disabled={mut.isPending} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
              {mut.isPending ? <><Loader2 size={15} className="animate-spin" />Registering...</> : 'Register Borrower'}
            </button>
          </form>
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
