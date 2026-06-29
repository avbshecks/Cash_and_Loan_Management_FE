'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ClipboardCheck, DollarSign, FileText, CheckCircle2,
  XCircle, Loader2, X, AlertTriangle, Zap, PiggyBank
} from 'lucide-react';
import api from '@/lib/api';
import { PendingCashDisbursement, PendingLoan, PendingSafekeepingWithdrawal } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

type Tab = 'cash' | 'loan-approval' | 'loan-disburse' | 'safekeeping';

export default function PendingApprovalsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('cash');

  const { data: cashPending = [], isLoading: loadCash } = useQuery<PendingCashDisbursement[]>({
    queryKey: ['cashPending'],
    queryFn: () => api.get('/cash/pending').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: loanPending, isLoading: loadLoan } = useQuery<{ pendingApproval: PendingLoan[]; pendingDisbursement: PendingLoan[] }>({
    queryKey: ['loanPending'],
    queryFn: () => api.get('/loan/pending').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: skPending = [], isLoading: loadSk } = useQuery<PendingSafekeepingWithdrawal[]>({
    queryKey: ['safekeepingPending'],
    queryFn: () => api.get('/safekeeping/pending').then(r => r.data),
    refetchInterval: 30_000,
  });

  const tabs = [
    { key: 'cash' as Tab,         label: 'Cash Disbursements',  icon: <DollarSign size={14} />,  count: cashPending.length },
    { key: 'loan-approval' as Tab, label: 'Loan Approvals',      icon: <FileText size={14} />,    count: loanPending?.pendingApproval.length ?? 0 },
    { key: 'loan-disburse' as Tab, label: 'Loan Disbursements',  icon: <Zap size={14} />,          count: loanPending?.pendingDisbursement.length ?? 0 },
    { key: 'safekeeping' as Tab,  label: 'Safekeeping Withdrawals', icon: <PiggyBank size={14} />, count: skPending.length },
  ];

  const total = cashPending.length + (loanPending?.pendingApproval.length ?? 0) + (loanPending?.pendingDisbursement.length ?? 0) + skPending.length;

  return (
    <div>
      <Header title="Pending Approvals" subtitle={total > 0 ? `${total} item(s) require your action` : 'All caught up!'} />

      {total > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 mb-5 flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span><strong>{total} pending item(s)</strong> require review before they take effect. Approve or reject each one below.</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === t.key ? 'bg-amber-500 text-slate-900' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.icon} {t.label}
            {t.count > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'cash'         && <CashDisbursementsTab data={cashPending}                           isLoading={loadCash}  qc={qc} />}
      {tab === 'loan-approval'&& <LoanApprovalsTab      data={loanPending?.pendingApproval ?? []}   isLoading={loadLoan}  qc={qc} />}
      {tab === 'loan-disburse'&& <LoanDisbursementsTab  data={loanPending?.pendingDisbursement ?? []} isLoading={loadLoan} qc={qc} />}
      {tab === 'safekeeping'  && <SafekeepingWithdrawalsTab data={skPending}                        isLoading={loadSk}    qc={qc} />}
    </div>
  );
}

// ─── Safekeeping Withdrawals Tab ──────────────────────────────────────────────
function SafekeepingWithdrawalsTab({ data, isLoading, qc }: { data: PendingSafekeepingWithdrawal[]; isLoading: boolean; qc: any }) {
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/safekeeping/withdrawals/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['safekeepingPending'] }); qc.invalidateQueries({ queryKey: ['safekeeping'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {isLoading ? <LoadingSpinner /> : data.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No pending safekeeping withdrawals" sub="All collections have been reviewed" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Date','Depositor','Amount','Reference','Requested By','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(w => (
                <tr key={w.id} className="hover:bg-amber-50 transition">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(w.date).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{w.depositorName}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{usd(w.amount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{w.reference}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{w.requestedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => approve.mutate(w.id)} disabled={approve.isPending}
                        className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                        {approve.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                      </button>
                      <button onClick={() => setRejectTarget(w.id)}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rejectTarget && <RejectModal title="Reject Safekeeping Withdrawal"
        onReject={async (reason) => { await api.post(`/safekeeping/withdrawals/${rejectTarget}/reject`, reason, { headers: { 'Content-Type': 'application/json' } }); qc.invalidateQueries({ queryKey: ['safekeepingPending'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); }}
        onClose={() => setRejectTarget(null)} />}
    </div>
  );
}

// ─── Cash Disbursements Tab ───────────────────────────────────────────────────
function CashDisbursementsTab({ data, isLoading, qc }: { data: PendingCashDisbursement[]; isLoading: boolean; qc: any }) {
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/cash/approve/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cashPending'] }); qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {isLoading ? <LoadingSpinner /> : data.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No pending cash disbursements" sub="All disbursements have been reviewed" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Date & Time','Amount','Recipient / Purpose','Reference','Requested By','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(tx => (
                <tr key={tx.id} className="hover:bg-amber-50 transition">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(tx.date).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{usd(tx.amount)}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs">{tx.sourceOrPurpose}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{tx.reference}</td>
                  <td className="px-4 py-3 text-slate-600">{tx.requestedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => approve.mutate(tx.id)} disabled={approve.isPending}
                        className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50">
                        {approve.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                      </button>
                      <button onClick={() => setRejectTarget(tx.id)}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rejectTarget && <RejectModal title="Reject Cash Disbursement"
        onReject={async (reason) => { await api.post(`/cash/reject/${rejectTarget}`, reason, { headers: { 'Content-Type': 'application/json' } }); qc.invalidateQueries({ queryKey: ['cashPending'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); }}
        onClose={() => setRejectTarget(null)} />}
    </div>
  );
}

// ─── Loan Approvals Tab (Pending → Approved) ──────────────────────────────────
function LoanApprovalsTab({ data, isLoading, qc }: { data: PendingLoan[]; isLoading: boolean; qc: any }) {
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {isLoading ? <LoadingSpinner /> : data.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No loans awaiting approval" sub="All loan requests have been reviewed" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Reference','Borrower','Amount','Due Date','Terms','Requested By','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(loan => (
                <tr key={loan.id} className="hover:bg-amber-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{loan.referenceNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{loan.borrowerName}<br/><span className="text-xs text-slate-400">{loan.borrowerNationalId}</span></td>
                  <td className="px-4 py-3 font-bold text-slate-700">{usd(loan.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(loan.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[120px] truncate">{loan.repaymentTerms}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{loan.createdBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setApproveTarget(loan.id)}
                        className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition">
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button onClick={() => setRejectTarget(loan.id)}
                        className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {approveTarget && <CommentModal title="Approve Loan" buttonLabel="Approve Loan" buttonColor="green"
        onConfirm={async (comment) => { await api.post(`/loan/approve/${approveTarget}`, comment, { headers: { 'Content-Type': 'application/json' } }); qc.invalidateQueries({ queryKey: ['loanPending'] }); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); }}
        onClose={() => setApproveTarget(null)} />}
      {rejectTarget && <RejectModal title="Reject Loan"
        onReject={async (reason) => { await api.post(`/loan/reject/${rejectTarget}`, reason, { headers: { 'Content-Type': 'application/json' } }); qc.invalidateQueries({ queryKey: ['loanPending'] }); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); }}
        onClose={() => setRejectTarget(null)} />}
    </div>
  );
}

// ─── Loan Disbursements Tab (Approved → Active) ───────────────────────────────
function LoanDisbursementsTab({ data, isLoading, qc }: { data: PendingLoan[]; isLoading: boolean; qc: any }) {
  const disburse = useMutation({
    mutationFn: (id: number) => api.post(`/loan/disburse/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loanPending'] }); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['balance'] }); qc.invalidateQueries({ queryKey: ['pendingCount'] }); },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {isLoading ? <LoadingSpinner /> : data.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No loans awaiting disbursement" sub="All approved loans have been disbursed" />
      ) : (
        <>
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-800 flex items-center gap-2">
            <Zap size={14} className="flex-shrink-0" />
            Disbursing a loan deducts the loan amount from the cash balance and activates the loan.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Reference','Borrower','Amount','Due Date','Approved By','Approved On','Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(loan => (
                  <tr key={loan.id} className="hover:bg-blue-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{loan.referenceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{loan.borrowerName}<br/><span className="text-xs text-slate-400">{loan.borrowerNationalId}</span></td>
                    <td className="px-4 py-3 font-bold text-slate-700">{usd(loan.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(loan.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{loan.approvedBy}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{loan.approvedAt ? new Date(loan.approvedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm(`Disburse ${usd(loan.amount)} for loan ${loan.referenceNumber}? This will deduct from cash balance.`)) disburse.mutate(loan.id); }}
                        disabled={disburse.isPending}
                        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                        {disburse.isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Disburse Cash
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared modal components ──────────────────────────────────────────────────
function RejectModal({ title, onReject, onClose }: { title: string; onReject: (r: string) => Promise<void>; onClose: () => void }) {
  const { register, handleSubmit } = useForm<{ reason: string }>();
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-red-700">{title}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit(async d => { setLoading(true); try { await onReject(d.reason); onClose(); } finally { setLoading(false); } })}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for rejection</label>
            <textarea {...register('reason', { required: true })} rows={3}
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Confirm Rejection
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentModal({ title, buttonLabel, buttonColor, onConfirm, onClose }: { title: string; buttonLabel: string; buttonColor: string; onConfirm: (c: string) => Promise<void>; onClose: () => void }) {
  const { register, handleSubmit } = useForm<{ comment: string }>();
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit(async d => { setLoading(true); try { await onConfirm(d.comment || 'Approved'); onClose(); } finally { setLoading(false); } })}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Comment (optional)</label>
            <textarea {...register('comment')} rows={2} placeholder="Add a note..."
              className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className={`w-full font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60
              ${buttonColor === 'green' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'}`}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {buttonLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
