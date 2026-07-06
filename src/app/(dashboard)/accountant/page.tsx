'use client';

import { useState, useEffect, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Calculator, PlusCircle, MinusCircle, ListOrdered, Sunrise,
  Loader2, CheckCircle, Hash, FileSpreadsheet, FileDown, TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import api from '@/lib/api';
import { AccountantDailyReport } from '@/lib/types';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getToken, getStoredUser } from '@/lib/auth';
import { canAccountant, canRequestReversal } from '@/lib/permissions';
import { RotateCcw, X as XIcon } from 'lucide-react';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = 'opening' | 'add' | 'disburse' | 'report';

async function downloadExcel(url: string, filename: string) {
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

export default function AccountantPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('report');

  const { data: balance, isLoading } = useQuery<{ currentBalance: number; initialized: boolean }>({
    queryKey: ['accountantBalance'],
    queryFn: () => api.get('/accountant/balance').then(r => r.data),
  });

  const initialized = balance?.initialized ?? true;
  const bookEntry = canAccountant(getStoredUser()?.role);   // Admin & Accountant may post to the book

  useEffect(() => {
    if (balance && !initialized && bookEntry) setTab('opening');
    else if (balance && (initialized || !bookEntry) && tab === 'opening') setTab('report');
  }, [balance, initialized]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = !initialized
    ? (bookEntry ? [{ key: 'opening', label: 'Initial Balance', icon: <Sunrise size={15} /> }]
                 : [{ key: 'report', label: 'Daily Report', icon: <ListOrdered size={15} /> }])
    : bookEntry
      ? [
          { key: 'report',   label: 'Daily Report', icon: <ListOrdered size={15} /> },
          { key: 'add',      label: 'Cash In',      icon: <PlusCircle size={15} /> },
          { key: 'disburse', label: 'Cash Out',     icon: <MinusCircle size={15} /> },
        ]
      : [{ key: 'report', label: 'Daily Report', icon: <ListOrdered size={15} /> }];

  return (
    <div>
      <Header title="Accountant Book" subtitle="Separate cash book managed by the accountant" />

      <div className="mb-6">
        {isLoading
          ? <LoadingSpinner label="Loading balance..." />
          : <StatCard label="Accountant Book Balance" value={balance ? usd(balance.currentBalance) : '—'} icon={Calculator} color="blue" sub="Separate from main cashbox" />}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === t.key ? 'bg-amber-500 text-slate-900' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'report' ? (
        <DailyReportTab />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
          {tab === 'opening'  && <MovementForm mode="opening-balance" title="Set Initial Book Balance" note="One-time setup. The book then carries forward automatically." qc={qc} />}
          {tab === 'add'      && <MovementForm mode="add" title="Cash In" note="Money received into the accountant book." qc={qc} />}
          {tab === 'disburse' && <MovementForm mode="disburse" title="Cash Out" note="Payment made from the accountant book." qc={qc} />}
        </div>
      )}
    </div>
  );
}

function MovementForm({ mode, title, note, qc }: { mode: string; title: string; note: string; qc: any }) {
  const { register, handleSubmit, reset } = useForm<{ amount: number; sourceOrPurpose: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: any) => api.post(`/accountant/${mode}`, { amount: Number(d.amount), sourceOrPurpose: d.sourceOrPurpose }),
    onSuccess: (res) => {
      setOk(res.data.reference ? `${res.data.message} Ref: ${res.data.reference}` : res.data.message);
      reset();
      qc.invalidateQueries({ queryKey: ['accountantBalance'] });
      qc.invalidateQueries({ queryKey: ['accountantDaily'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">{title}</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">{note}</div>
      {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} /> {ok}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{err}</div>}
      <Field label="Amount (USD)" type="number" step="0.01" {...register('amount', { required: true })} />
      <Field label={mode === 'disburse' ? 'Purpose / Paid To' : 'Source / Description'} {...register('sourceOrPurpose', { required: mode !== 'opening-balance' })} placeholder="e.g. Bank withdrawal, Salaries" />
      <p className="flex items-center gap-1.5 text-xs text-slate-400"><Hash size={12} /> A reference number will be generated automatically.</p>
      <button type="submit" disabled={mut.isPending}
        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
        {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : title}
      </button>
    </form>
  );
}

function DailyReportTab() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reverseTarget, setReverseTarget] = useState<{ id: number; reference: string; amount: number; type: string } | null>(null);
  const allowReverse = canRequestReversal(getStoredUser()?.role);

  const isCustom  = period === 'custom';
  const validRange = !isCustom || (from && to && from <= to);
  const qs = isCustom ? `from=${from}&to=${to}&period=custom` : `date=${date}&period=${period}`;

  const { data, isLoading } = useQuery<AccountantDailyReport>({
    queryKey: ['accountantDaily', date, period, from, to],
    queryFn: () => api.get(`/accountant/daily-report?${qs}`).then(r => r.data),
    enabled: !!validRange,
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">Period:</span>
        <select value={period} onChange={e => setPeriod(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Range</option>
        </select>
        {isCustom ? (
          <>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
          </>
        ) : (
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        )}
        <div className="ml-auto flex gap-2">
          <button disabled={!validRange} onClick={() => downloadExcel(`/accountant/daily-report/export?${qs}&format=xlsx`, `CALM_Accountant_${period}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition disabled:opacity-50">
            <FileSpreadsheet size={13} /> Excel (DR/CR)
          </button>
          <button disabled={!validRange} onClick={() => downloadExcel(`/accountant/daily-report/export?${qs}&format=pdf`, `CALM_Accountant_${period}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition disabled:opacity-50">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Opening Balance', value: usd(data.openingBalance), icon: DollarSign,   bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Cash In',         value: usd(data.totalAdded),     icon: TrendingUp,   bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
              { label: 'Cash Out',        value: usd(data.totalDisbursed), icon: TrendingDown, bg: 'bg-red-50 border-red-200',     text: 'text-red-700' },
              { label: 'Closing Balance', value: usd(data.closingBalance), icon: Calculator,   bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700' },
            ].map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={14} className={text} />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                </div>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {data.transactions.length === 0 ? (
              <EmptyState icon={ListOrdered} title="No transactions on this date" sub="Book movements will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Time', 'Type', 'DR (USD)', 'CR (USD)', 'Source / Purpose', 'Reference', 'By', ...(allowReverse ? ['Action'] : [])].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.transactions.map(t => {
                      const isDebit = t.type === 'Disbursement';
                      const reversible = allowReverse && !t.isReversed && !t.isReversal && !t.reversalStatus;
                      return (
                        <tr key={t.id} className={`hover:bg-slate-50 transition ${t.isReversed ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3 text-slate-600">{t.type === 'OpeningBalance' ? 'Opening' : t.type}</td>
                          <td className="px-4 py-3 font-semibold text-red-600">{isDebit ? `-${usd(t.amount)}` : ''}</td>
                          <td className="px-4 py-3 font-semibold text-green-600">{!isDebit ? usd(t.amount) : ''}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {t.sourceOrPurpose}
                            {t.approvalStatus === 'Pending' && <span className="ml-2 text-xs text-amber-600 font-medium">(awaiting approval)</span>}
                            {t.approvalStatus === 'Rejected' && <span className="ml-2 text-xs text-red-500 font-medium">(rejected)</span>}
                            {t.isReversed && <span className="ml-2 text-xs text-red-500 font-medium">(reversed)</span>}
                            {t.isReversal && <span className="ml-2 text-xs text-blue-500 font-medium">(reversal)</span>}
                            {t.reversalStatus === 'Pending' && <span className="ml-2 text-xs text-amber-600 font-medium">(reversal pending)</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.reference}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{t.createdBy}</td>
                          {allowReverse && (
                            <td className="px-4 py-3">
                              {reversible && (
                                <button onClick={() => setReverseTarget({ id: t.id, reference: t.reference, amount: t.amount, type: t.type })}
                                  className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-md hover:bg-red-100 transition font-medium">
                                  <RotateCcw size={12} /> Request Reversal
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {reverseTarget && <ReverseModal target={reverseTarget} onClose={() => setReverseTarget(null)} qc={qc} />}
    </div>
  );
}

function ReverseModal({ target, onClose, qc }: { target: { id: number; reference: string; amount: number; type: string }; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ reason: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (reason: string) => api.post(`/accountant/reverse/${target.id}`, reason, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: (res) => {
      setOk(res.data.message);
      qc.invalidateQueries({ queryKey: ['accountantDaily'] });
      qc.invalidateQueries({ queryKey: ['pendingCount'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Request Reversal</h2>
          <button onClick={onClose}><XIcon size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            Requesting reversal of <strong>{target.reference}</strong> ({usd(target.amount)} {target.type}). This needs Manager approval before a contra entry is posted.
          </div>
          {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} /> {ok}</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{err}</div>}
          {!ok && (
            <form onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d.reason); })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for reversal</label>
                <textarea {...register('reason', { required: true })} rows={3} placeholder="e.g. Amount captured as 1000 instead of 100"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
              <button type="submit" disabled={mut.isPending}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : <><RotateCcw size={15} /> Submit Request</>}
              </button>
            </form>
          )}
          {ok && <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>}
        </div>
      </div>
    </div>
  );
}

const Field = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input ref={ref} {...props} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
    </div>
  )
);
Field.displayName = 'Field';
