'use client';

import { useState, useEffect, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Wallet, PlusCircle, MinusCircle, ClipboardCheck, Sunrise, Loader2,
  CheckCircle, Hash, ListOrdered, RotateCcw, X
} from 'lucide-react';
import api from '@/lib/api';
import { CashBalance, AddCashRequest, DisburseCashRequest, ReconcileRequest, OpeningBalanceRequest, CashLedgerEntry } from '@/lib/types';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getStoredUser } from '@/lib/auth';

type Tab = 'opening' | 'add' | 'disburse' | 'reconcile' | 'transactions';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SuccessMsg({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={16} /> {msg}</div>;
}
function ErrorMsg({ msg }: { msg: string }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>;
}

export default function CashPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('add');

  const { data: balance, isLoading } = useQuery<CashBalance>({
    queryKey: ['balance'],
    queryFn: () => api.get('/cash/balance').then(r => r.data),
  });

  const initialized = balance?.initialized ?? true;

  // Before the system is initialized, force the one-time opening-balance setup
  useEffect(() => {
    if (balance && !initialized) setTab('opening');
    else if (balance && initialized && tab === 'opening') setTab('add');
  }, [balance, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n?: number) => (n != null ? usd(n) : '—');

  // Opening tab only appears during one-time setup; transactions tab always (once initialized)
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = initialized
    ? [
        { key: 'add',          label: 'Add Cash',     icon: <PlusCircle size={15} /> },
        { key: 'disburse',     label: 'Disburse',     icon: <MinusCircle size={15} /> },
        { key: 'reconcile',    label: 'Reconcile',    icon: <ClipboardCheck size={15} /> },
        { key: 'transactions', label: 'Transactions', icon: <ListOrdered size={15} /> },
      ]
    : [{ key: 'opening', label: 'Initial Balance', icon: <Sunrise size={15} /> }];

  return (
    <div>
      <Header title="Cash Management" subtitle="Manage daily cash operations" />

      <div className="mb-6">
        {isLoading
          ? <LoadingSpinner label="Loading balance..." />
          : <StatCard label="Current Cash Balance" value={fmt(balance?.currentBalance)} icon={Wallet} color="amber" sub="USD" />}
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

      {tab === 'transactions' ? (
        <TransactionsTab qc={qc} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
          {tab === 'opening'   && <OpeningBalanceForm qc={qc} />}
          {tab === 'add'       && <AddCashForm qc={qc} />}
          {tab === 'disburse'  && <DisburseCashForm qc={qc} />}
          {tab === 'reconcile' && <ReconcileForm qc={qc} balance={balance?.currentBalance ?? 0} />}
        </div>
      )}
    </div>
  );
}

// ─── Initial Opening Balance (one-time) ───────────────────────────────────────
function OpeningBalanceForm({ qc }: { qc: any }) {
  const { register, handleSubmit, reset } = useForm<OpeningBalanceRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: OpeningBalanceRequest) => api.post('/cash/opening-balance', d),
    onSuccess: (res) => { setOk(res.data.message); reset(); qc.invalidateQueries({ queryKey: ['balance'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">Set Initial Opening Balance</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">
        This is a <strong>one-time</strong> setup of the starting cash. After this, each day's opening balance carries forward automatically from the previous day's closing balance.
      </div>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}
      <Field label="Initial Cash Amount (USD)" type="number" step="0.01" {...register('amount', { required: true, valueAsNumber: true })} />
      <Field label="Notes (optional)" {...register('notes')} />
      <SubmitBtn loading={mut.isPending} label="Set Initial Balance" />
    </form>
  );
}

// ─── Add Cash ─────────────────────────────────────────────────────────────────
function AddCashForm({ qc }: { qc: any }) {
  const { register, handleSubmit, reset } = useForm<AddCashRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: AddCashRequest) => api.post('/cash/add', d),
    onSuccess: (res) => { setOk(`Cash added (Ref: ${res.data.reference}). New balance: ${usd(res.data.newBalance)}`); reset(); qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['cashLedger'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">Add Cash to Cashbox</h3>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}
      <Field label="Amount (USD)" type="number" step="0.01" {...register('amount', { required: true, valueAsNumber: true })} />
      <Field label="Source" placeholder="e.g. HQ Transfer" {...register('source', { required: true })} />
      <RefNote text="A reference number will be generated automatically." />
      <SubmitBtn loading={mut.isPending} label="Add Cash" />
    </form>
  );
}

// ─── Disburse ─────────────────────────────────────────────────────────────────
function DisburseCashForm({ qc }: { qc: any }) {
  const { register, handleSubmit, reset } = useForm<DisburseCashRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: DisburseCashRequest) => api.post('/cash/disburse', d),
    onSuccess: (res) => { setOk(`Disbursement ${res.data.reference} submitted for approval. It will affect the balance once a checker approves it.`); reset(); qc.invalidateQueries({ queryKey: ['pendingCount'] }); qc.invalidateQueries({ queryKey: ['cashLedger'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">Disburse Cash</h3>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">
        Disbursements require checker approval before they affect the balance.
      </div>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}
      <Field label="Amount (USD)" type="number" step="0.01" {...register('amount', { required: true, valueAsNumber: true })} />
      <Field label="Recipient" placeholder="Name or department" {...register('recipient', { required: true })} />
      <Field label="Purpose" placeholder="e.g. Fuel purchase" {...register('purpose', { required: true })} />
      <RefNote text="A reference number will be generated automatically." />
      <SubmitBtn loading={mut.isPending} label="Submit for Approval" />
    </form>
  );
}

// ─── Reconcile (opening balance auto carry-forward) ───────────────────────────
function ReconcileForm({ qc, balance }: { qc: any; balance: number }) {
  const { register, handleSubmit, reset } = useForm<ReconcileRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const { data: opening } = useQuery<{ openingBalance: number }>({
    queryKey: ['todayOpening'],
    queryFn: () => api.get('/cash/opening-balance/today').then(r => r.data),
  });

  const mut = useMutation({
    mutationFn: (d: ReconcileRequest) => api.post('/cash/reconcile', d),
    onSuccess: (res) => {
      setOk(`Reconciliation saved. ${res.data.status}. Variance: ${usd(res.data.variance)}`);
      reset();
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate({ ...d, openingBalance: opening?.openingBalance ?? 0 }); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">End-of-Day Reconciliation</h3>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
          <p className="text-xs text-slate-500">Opening (carried forward)</p>
          <p className="font-semibold text-slate-700">{opening ? usd(opening.openingBalance) : '…'}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
          <p className="text-xs text-amber-600">System closing balance</p>
          <p className="font-semibold text-amber-700">{usd(balance)}</p>
        </div>
      </div>

      <Field label="Actual Cash on Hand (USD)" type="number" step="0.01" placeholder="Physically counted cash"
        {...register('actualEndBalance', { required: true, valueAsNumber: true })} />
      <Field label="Comment" placeholder="Any notes on variance" {...register('comment')} />
      <p className="text-xs text-slate-400">Opening balance is set automatically — no manual capture.</p>
      <SubmitBtn loading={mut.isPending} label="Save Reconciliation" />
    </form>
  );
}

// ─── Transactions ledger + reversal ───────────────────────────────────────────
function TransactionsTab({ qc }: { qc: any }) {
  const role = getStoredUser()?.role;
  const canReverse = role === 'Admin' || role === 'Manager';
  const [reverseTarget, setReverseTarget] = useState<CashLedgerEntry | null>(null);

  const { data, isLoading } = useQuery<{ transactions: CashLedgerEntry[]; total: number }>({
    queryKey: ['cashLedger'],
    queryFn: () => api.get('/cash/transactions?pageSize=100').then(r => r.data),
  });

  const txns = data?.transactions ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {isLoading ? <LoadingSpinner /> : txns.length === 0 ? (
        <EmptyState icon={ListOrdered} title="No transactions yet" sub="Cash movements will appear here" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Date', 'Reference', 'Type', 'Amount', 'Source / Purpose', 'Status', canReverse ? 'Action' : ''].filter(Boolean).map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.map(t => {
                const isCredit = t.type === 'Addition' || t.type === 'OpeningBalance';
                const reversible = canReverse && !t.isReversed && !t.isReversal
                  && (t.status === 'AutoApproved' || t.status === 'Approved');
                return (
                  <tr key={t.id} className={`hover:bg-slate-50 transition ${t.isReversed ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(t.date).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.reference}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'OpeningBalance' ? 'Opening' : t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${t.amount < 0 ? 'text-slate-500' : isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount < 0 ? '' : isCredit ? '+' : '-'}{usd(Math.abs(t.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {t.sourceOrPurpose}
                      {t.isReversed && <span className="ml-2 text-xs text-red-500 font-medium">(reversed)</span>}
                      {t.isReversal && <span className="ml-2 text-xs text-blue-500 font-medium">(reversal)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                        ${t.status === 'Pending' ? 'bg-amber-100 text-amber-700'
                          : t.status === 'Rejected' ? 'bg-slate-100 text-slate-500'
                          : 'bg-green-100 text-green-700'}`}>
                        {t.status === 'AutoApproved' ? 'Posted' : t.status}
                      </span>
                    </td>
                    {canReverse && (
                      <td className="px-4 py-3">
                        {reversible && (
                          <button onClick={() => setReverseTarget(t)}
                            className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-md hover:bg-red-100 transition font-medium">
                            <RotateCcw size={12} /> Reverse
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
      {reverseTarget && <ReverseModal entry={reverseTarget} onClose={() => setReverseTarget(null)} qc={qc} />}
    </div>
  );
}

function ReverseModal({ entry, onClose, qc }: { entry: CashLedgerEntry; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ reason: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (reason: string) => api.post(`/cash/reverse/${entry.id}`, reason, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: (res) => {
      setOk(`${res.data.message} New balance: ${usd(res.data.newBalance)}`);
      qc.invalidateQueries({ queryKey: ['cashLedger'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Reverse Transaction</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            Reversing <strong>{entry.reference}</strong> ({usd(Math.abs(entry.amount))} {entry.type}). A contra entry will net it to zero; then post the correct amount.
          </div>
          {ok && <SuccessMsg msg={ok} />}
          {err && <ErrorMsg msg={err} />}
          {!ok && (
            <form onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d.reason); })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for reversal</label>
                <textarea {...register('reason', { required: true })} rows={3} placeholder="e.g. Amount captured as 1000 instead of 100"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
              <button type="submit" disabled={mut.isPending}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Reversing…</> : <><RotateCcw size={15} /> Confirm Reversal</>}
              </button>
            </form>
          )}
          {ok && <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
const Field = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input ref={ref} {...props} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
    </div>
  )
);
Field.displayName = 'Field';

function RefNote({ text }: { text: string }) {
  return <p className="flex items-center gap-1.5 text-xs text-slate-400"><Hash size={12} /> {text}</p>;
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
      {loading ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : label}
    </button>
  );
}
