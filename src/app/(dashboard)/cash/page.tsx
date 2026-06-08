'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Wallet, PlusCircle, MinusCircle, ClipboardCheck, Sunrise, Loader2, CheckCircle, Hash } from 'lucide-react';
import api from '@/lib/api';
import { CashBalance, AddCashRequest, DisburseCashRequest, ReconcileRequest, OpeningBalanceRequest } from '@/lib/types';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';

type Tab = 'opening' | 'add' | 'disburse' | 'reconcile';

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
      <CheckCircle size={16} /> {msg}
    </div>
  );
}
function ErrorMsg({ msg }: { msg: string }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{msg}</div>;
}

export default function CashPage() {
  const [tab, setTab] = useState<Tab>('opening');
  const qc = useQueryClient();

  const { data: balance, isLoading } = useQuery<CashBalance>({
    queryKey: ['balance'],
    queryFn: () => api.get('/cash/balance').then(r => r.data),
  });

  const fmt = (n?: number) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'opening',   label: 'Opening Balance', icon: <Sunrise size={15} /> },
    { key: 'add',       label: 'Add Cash',         icon: <PlusCircle size={15} /> },
    { key: 'disburse',  label: 'Disburse',         icon: <MinusCircle size={15} /> },
    { key: 'reconcile', label: 'Reconcile',        icon: <ClipboardCheck size={15} /> },
  ];

  return (
    <div>
      <Header title="Cash Management" subtitle="Manage daily cash operations" />

      <div className="mb-6">
        {isLoading
          ? <LoadingSpinner label="Loading balance..." />
          : <StatCard label="Current Cash Balance" value={fmt(balance?.currentBalance)} icon={Wallet} color="amber" sub="USD" />
        }
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === t.key ? 'bg-amber-500 text-slate-900' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg">
        {tab === 'opening'   && <OpeningBalanceForm qc={qc} />}
        {tab === 'add'       && <AddCashForm qc={qc} />}
        {tab === 'disburse'  && <DisburseCashForm qc={qc} />}
        {tab === 'reconcile' && <ReconcileForm qc={qc} balance={balance?.currentBalance ?? 0} />}
      </div>
    </div>
  );
}

// ─── Opening Balance Form ─────────────────────────────────────────────────────
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
      <h3 className="font-semibold text-slate-700">Set Today's Opening Balance</h3>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}
      <Field label="Opening Amount (USD)" type="number" step="0.01" {...register('amount', { required: true, valueAsNumber: true })} />
      <Field label="Notes (optional)" {...register('notes')} />
      <SubmitBtn loading={mut.isPending} label="Set Opening Balance" />
    </form>
  );
}

// ─── Add Cash Form ────────────────────────────────────────────────────────────
function AddCashForm({ qc }: { qc: any }) {
  const { register, handleSubmit, reset } = useForm<AddCashRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: AddCashRequest) => api.post('/cash/add', d),
    onSuccess: (res) => { setOk(`Cash added (Ref: ${res.data.reference}). New balance: $${res.data.newBalance?.toLocaleString('en-US', {minimumFractionDigits:2})}`); reset(); qc.invalidateQueries({ queryKey: ['balance'] }); },
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

// ─── Disburse Cash Form ───────────────────────────────────────────────────────
function DisburseCashForm({ qc }: { qc: any }) {
  const { register, handleSubmit, reset } = useForm<DisburseCashRequest>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: DisburseCashRequest) => api.post('/cash/disburse', d),
    onSuccess: (res) => { setOk(`Disbursement ${res.data.reference} submitted for approval. It will affect the balance once a checker approves it.`); reset(); qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); },
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

// ─── Reconcile Form ───────────────────────────────────────────────────────────
function ReconcileForm({ qc, balance }: { qc: any; balance: number }) {
  const { register, handleSubmit, reset } = useForm<ReconcileRequest>({ defaultValues: { openingBalance: balance } });
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: ReconcileRequest) => api.post('/cash/reconcile', d),
    onSuccess: (res) => {
      const { variance, status } = res.data;
      setOk(`Reconciliation saved. ${status}. Variance: $${variance?.toLocaleString('en-US', {minimumFractionDigits:2})}`);
      reset();
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate(d); })} className="space-y-4">
      <h3 className="font-semibold text-slate-700">End-of-Day Reconciliation</h3>
      {ok && <SuccessMsg msg={ok} />}
      {err && <ErrorMsg msg={err} />}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
        System balance: <strong>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
      </div>
      <Field label="Opening Balance (USD)" type="number" step="0.01" {...register('openingBalance', { required: true, valueAsNumber: true })} />
      <Field label="Actual End Balance (USD)" type="number" step="0.01" {...register('actualEndBalance', { required: true, valueAsNumber: true })} />
      <Field label="Comment" placeholder="Any notes on variance" {...register('comment')} />
      <SubmitBtn loading={mut.isPending} label="Save Reconciliation" />
    </form>
  );
}

// ─── Reusable form primitives ─────────────────────────────────────────────────
import { forwardRef } from 'react';

const Field = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        ref={ref}
        {...props}
        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
      />
    </div>
  )
);
Field.displayName = 'Field';

function RefNote({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-400">
      <Hash size={12} /> {text}
    </p>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
    >
      {loading ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : label}
    </button>
  );
}
