'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, PiggyBank, Loader2, X, CheckCircle,
  ArrowDownCircle, ArrowUpCircle, Calendar, Wallet
} from 'lucide-react';
import api from '@/lib/api';
import { SafekeepingAccountDetail } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—');
const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

export default function SafekeepingDetailPage() {
  const params = useParams();
  const qc = useQueryClient();
  const id = Number(params.id);
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null);

  const { data: acc, isLoading } = useQuery<SafekeepingAccountDetail>({
    queryKey: ['safekeepingAccount', id],
    queryFn: () => api.get(`/safekeeping/accounts/${id}`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner label="Loading account…" />;
  if (!acc) return (
    <div className="text-center py-16 text-slate-400">
      <PiggyBank size={40} strokeWidth={1.2} className="mx-auto mb-3" />
      <p>Account not found.</p>
      <Link href="/safekeeping" className="text-amber-500 text-sm hover:underline mt-2 inline-block">← Back to safekeeping</Link>
    </div>
  );

  return (
    <div>
      <Link href="/safekeeping" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition">
        <ArrowLeft size={15} /> Back to safekeeping
      </Link>

      <Header title={acc.depositorName} subtitle={`${acc.phone}${acc.nationalId ? ' · ' + acc.nationalId : ''}`} />

      {/* Balance + actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Wallet size={22} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Balance Held</p>
            <p className="text-2xl font-bold text-blue-700">{usd(acc.currentBalance)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('deposit')}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
            <ArrowDownCircle size={16} /> Leave Money
          </button>
          <button onClick={() => setModal('withdraw')} disabled={acc.currentBalance <= 0}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
            <ArrowUpCircle size={16} /> Collect Money
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Date First Left', value: d(acc.dateFirstLeft),  icon: Calendar,        color: 'text-slate-700' },
          { label: 'Last Collection', value: d(acc.lastCollection), icon: Calendar,        color: 'text-slate-700' },
          { label: 'Total Deposited', value: usd(acc.totalDeposited), icon: ArrowDownCircle, color: 'text-green-600' },
          { label: 'Total Collected', value: usd(acc.totalCollected), icon: ArrowUpCircle,   color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5"><Icon size={14} className="text-slate-400" /><span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span></div>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Statement */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <PiggyBank size={15} className="text-amber-500" />
          <h3 className="font-semibold text-slate-700 text-sm">Statement</h3>
          <span className="text-xs text-slate-400 ml-auto">{acc.transactionCount} movement(s)</span>
        </div>
        {acc.statement.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Wallet size={32} strokeWidth={1.2} className="mx-auto mb-2" />
            <p className="text-sm">No deposits or collections yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Date', 'Type', 'Status', 'Amount', 'Balance After', 'Reference', 'By'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {acc.statement.slice().reverse().map(s => {
                  const isDeposit = s.type === 'Deposit';
                  const pending = s.status === 'Pending';
                  const rejected = s.status === 'Rejected';
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 transition ${rejected ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{dt(s.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDeposit ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isDeposit ? 'Left' : 'Collected'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isDeposit ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                            ${pending ? 'bg-amber-100 text-amber-700' : rejected ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                            {pending ? 'Pending Approval' : rejected ? 'Rejected' : 'Approved'}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                        {isDeposit ? '+' : '-'}{usd(s.amount)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{pending || rejected ? '—' : usd(s.balanceAfter)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.reference}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{s.capturedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <MovementModal mode={modal} accountId={id} balance={acc.currentBalance} depositor={acc.depositorName} onClose={() => setModal(null)} qc={qc} />}
    </div>
  );
}

function MovementModal({ mode, accountId, balance, depositor, onClose, qc }:
  { mode: 'deposit' | 'withdraw'; accountId: number; balance: number; depositor: string; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ amount: number; notes?: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const isDeposit = mode === 'deposit';

  const mut = useMutation({
    mutationFn: (d: any) => api.post(`/safekeeping/accounts/${accountId}/${isDeposit ? 'deposit' : 'withdraw'}`, { amount: Number(d.amount), notes: d.notes }),
    onSuccess: (res) => {
      setOk(isDeposit
        ? `Deposit ${res.data.reference} recorded. Balance: ${usd(res.data.balance)}`
        : `Collection ${res.data.reference} submitted for approval. The depositor can be paid once a checker approves it.`);
      qc.invalidateQueries({ queryKey: ['safekeepingAccount', accountId] });
      qc.invalidateQueries({ queryKey: ['safekeeping'] });
      qc.invalidateQueries({ queryKey: ['pendingCount'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isDeposit ? 'Leave Money (Deposit)' : 'Collect Money (Withdraw)'}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
            {depositor} · Current balance: <strong>{usd(balance)}</strong>
          </div>
          {!isDeposit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">
              Collections require checker approval before the depositor is paid.
            </div>
          )}
          {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} />{ok}</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
          {!ok && (
            <form onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d); })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (USD)</label>
                <input type="number" step="0.01" {...(mode === 'withdraw' ? { max: balance } : {})} {...register('amount', { required: true })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                <input {...register('notes')} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <button type="submit" disabled={mut.isPending}
                className={`w-full font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60
                  ${isDeposit ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'}`}>
                {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : (isDeposit ? 'Record Deposit' : 'Record Collection')}
              </button>
            </form>
          )}
          {ok && <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>}
        </div>
      </div>
    </div>
  );
}
