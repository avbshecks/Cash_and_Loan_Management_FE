'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, User, Calendar, DollarSign, FileText, Loader2,
  CheckCircle, X, TrendingUp, Clock, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import Header from '@/components/Header';
import Badge, { statusVariant } from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getStoredUser } from '@/lib/auth';
import { canEntry } from '@/lib/permissions';

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = Number(params.id);
  const [showRepay, setShowRepay] = useState(false);

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => api.get(`/loan/${id}`).then(r => r.data),
  });

  const { data: statement } = useQuery({
    queryKey: ['loanStatement', id],
    queryFn: () => api.get(`/loan/${id}/statement`).then(r => r.data),
  });

  if (isLoading) return <LoadingSpinner label="Loading loan…" />;
  if (!loan) return (
    <div className="text-center py-16 text-slate-400">
      <FileText size={40} strokeWidth={1.2} className="mx-auto mb-3" />
      <p>Loan not found.</p>
      <Link href="/loans" className="text-amber-500 text-sm hover:underline mt-2 inline-block">← Back to loans</Link>
    </div>
  );

  const canRepay = canEntry(getStoredUser()?.role) && (loan.status === 'Active' || loan.status === 'Overdue');

  return (
    <div>
      <Link href="/loans" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition">
        <ArrowLeft size={15} /> Back to loans
      </Link>

      <Header title={loan.referenceNumber} subtitle={`Loan for ${loan.borrower.fullName}`} />

      {/* Status + progress banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge label={loan.status} variant={statusVariant(loan.status)} />
            {loan.daysOverdue > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle size={13} /> {loan.daysOverdue} days overdue
              </span>
            )}
          </div>
          {canRepay && (
            <button onClick={() => setShowRepay(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              <DollarSign size={15} /> Record Repayment
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Repayment Progress</span>
            <span className="font-semibold">{loan.repaymentProgress}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min(loan.repaymentProgress, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Loan Amount',      value: usd(loan.amount),           icon: DollarSign,  color: 'text-slate-700' },
          { label: 'Total Repaid',     value: usd(loan.totalRepaid),      icon: TrendingUp,  color: 'text-green-600' },
          { label: 'Outstanding',      value: usd(loan.remainingBalance), icon: Clock,       color: 'text-amber-600' },
          { label: 'Due Date',         value: new Date(loan.dueDate).toLocaleDateString(), icon: Calendar, color: 'text-slate-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon size={14} className="text-slate-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Borrower + meta */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-amber-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Borrower</h3>
          </div>
          <Detail label="Name" value={loan.borrower.fullName} />
          <Detail label="National ID" value={loan.borrower.nationalId} />
          <Detail label="Phone" value={loan.borrower.phone} />

          <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
            <Detail label="Repayment Terms" value={loan.repaymentTerms} />
            <Detail label="Created" value={new Date(loan.createdAt).toLocaleString()} />
            {loan.approvedAt && <Detail label="Approved" value={new Date(loan.approvedAt).toLocaleString()} />}
            {loan.disbursedAt && <Detail label="Disbursed" value={new Date(loan.disbursedAt).toLocaleString()} />}
            <Detail label="Created By" value={loan.createdBy} />
            {loan.approvedBy && <Detail label="Approved By" value={loan.approvedBy} />}
          </div>
        </div>

        {/* Repayment statement */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText size={15} className="text-amber-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Repayment Statement</h3>
            {statement && <span className="text-xs text-slate-400 ml-auto">{statement.repaymentCount} payment(s)</span>}
          </div>
          {!statement || statement.schedule.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <DollarSign size={32} strokeWidth={1.2} className="mx-auto mb-2" />
              <p className="text-sm">No repayments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Date','Status','Amount','Balance After','Reference','By'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statement.schedule.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.repaymentDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {r.status === 'Pending' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                        {r.status === 'Rejected' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>}
                        {r.status === 'Approved' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">+{usd(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.balanceAfter != null ? usd(r.balanceAfter) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.reference}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.capturedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showRepay && <RepaymentModal loanId={id} remaining={loan.remainingBalance} borrowerName={loan.borrower.fullName}
        onClose={() => setShowRepay(false)} qc={qc} />}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 font-medium">{value}</p>
    </div>
  );
}

function RepaymentModal({ loanId, remaining, borrowerName, onClose, qc }:
  { loanId: number; remaining: number; borrowerName: string; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ amount: number; reference: string }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: any) => api.post('/loan/repayment', { loanId, amount: Number(d.amount) }),
    onSuccess: (res) => {
      setOk(res.data.message ?? `Repayment submitted for approval. It will be applied once a Manager approves it.`);
      qc.invalidateQueries({ queryKey: ['loan', loanId] });
      qc.invalidateQueries({ queryKey: ['loanStatement', loanId] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Record Repayment</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
            {borrowerName} · Outstanding: <strong>{usd(remaining)}</strong>
          </div>
          {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} />{ok}</div>}
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
          {!ok && (
            <form onSubmit={handleSubmit(d => { setErr(''); mut.mutate(d); })} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (USD)</label>
                <input type="number" step="0.01" max={remaining} {...register('amount', { required: true })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <p className="text-xs text-slate-400">A repayment reference will be generated automatically.</p>
              <button type="submit" disabled={mut.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : 'Record Repayment'}
              </button>
            </form>
          )}
          {ok && <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>}
        </div>
      </div>
    </div>
  );
}
