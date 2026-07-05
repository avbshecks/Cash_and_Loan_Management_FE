'use client';

import { useState, forwardRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { PiggyBank, Plus, X, Loader2, Search, Wallet, FileSpreadsheet, FileDown } from 'lucide-react';
import api from '@/lib/api';
import { SafekeepingAccountSummary } from '@/lib/types';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getToken, getStoredUser } from '@/lib/auth';
import { canEntry } from '@/lib/permissions';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function downloadFile(url: string, filename: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!res.ok) { alert('Download failed.'); return; }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function SafekeepingPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const periodQs = (format: string) =>
    period === 'custom'
      ? `/safekeeping/report/period/export?from=${from}&to=${to}&format=${format}`
      : `/safekeeping/report/period/export?period=${period}&date=${today}&format=${format}`;
  const validRange = period !== 'custom' || (from && to && from <= to);

  const { data, isLoading } = useQuery<{ totalHeld: number; accounts: SafekeepingAccountSummary[] }>({
    queryKey: ['safekeeping'],
    queryFn: () => api.get('/safekeeping/accounts').then(r => r.data),
  });

  const accounts = (data?.accounts ?? []).filter(a =>
    a.depositorName.toLowerCase().includes(search.toLowerCase()) ||
    (a.nationalId ?? '').toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search)
  );

  return (
    <div>
      <Header title="Safekeeping" subtitle="Custodial cash held on behalf of depositors" />

      <div className="mb-6 max-w-sm">
        <StatCard label="Total Cash Held in Safekeeping" value={usd(data?.totalHeld ?? 0)} icon={Wallet} color="blue" sub="Belongs to depositors" />
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search depositor…"
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 w-64" />
        </div>
        {canEntry(getStoredUser()?.role) && <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          <Plus size={16} /> New Depositor
        </button>}
      </div>

      {/* Reports toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Reports:</span>
        <button onClick={() => downloadFile(`/safekeeping/report/export?format=xlsx`, `CALM_Safekeeping_Summary.xlsx`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition">
          <FileSpreadsheet size={13} /> Summary Excel
        </button>
        <button onClick={() => downloadFile(`/safekeeping/report/export?format=pdf`, `CALM_Safekeeping_Summary.pdf`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition">
          <FileDown size={13} /> Summary PDF
        </button>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={period} onChange={e => setPeriod(e.target.value as any)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          {period === 'custom' && (
            <>
              <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
            </>
          )}
          <button disabled={!validRange} onClick={() => downloadFile(periodQs('xlsx'), `CALM_Safekeeping_${period}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition disabled:opacity-50">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button disabled={!validRange} onClick={() => downloadFile(periodQs('pdf'), `CALM_Safekeeping_${period}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition disabled:opacity-50">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : accounts.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No safekeeping accounts" sub="Register a depositor to hold their cash" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Depositor', 'Phone', 'Deposited', 'Collected', 'Balance Held', 'Last Activity', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{a.depositorName}</p>
                      {a.nationalId && <p className="text-xs text-slate-400">{a.nationalId}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.phone}</td>
                    <td className="px-4 py-3 text-green-600">{usd(a.totalDeposited)}</td>
                    <td className="px-4 py-3 text-red-600">{usd(a.totalCollected)}</td>
                    <td className="px-4 py-3 font-bold text-blue-700">{usd(a.balance)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{a.lastActivity ? new Date(a.lastActivity).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/safekeeping/${a.id}`} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md hover:bg-slate-200 transition font-medium">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateAccountModal onClose={() => setShowCreate(false)} qc={qc} />}
    </div>
  );
}

function CreateAccountModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ depositorName: string; phone: string; nationalId?: string; notes?: string }>();
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/safekeeping/account', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safekeeping'] }); onClose(); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">New Safekeeping Depositor</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d); })}>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
          <MField label="Depositor Name" {...register('depositorName', { required: true })} placeholder="Full name" />
          <MField label="Phone" {...register('phone', { required: true })} placeholder="0977000000" />
          <MField label="National ID (optional)" {...register('nationalId')} />
          <MField label="Notes (optional)" {...register('notes')} />
          <button type="submit" disabled={mut.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : 'Create Account'}
          </button>
        </form>
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
