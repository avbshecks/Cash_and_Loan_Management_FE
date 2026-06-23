'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { OverdueLoan } from '@/lib/types';
import Header from '@/components/Header';
import Badge, { riskVariant } from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { getStoredUser } from '@/lib/auth';

export default function OverdueLoansPage() {
  const qc = useQueryClient();
  const [result, setResult] = useState('');
  const role = getStoredUser()?.role;
  const canRun = role === 'Admin' || role === 'Manager';

  const { data: loans = [], isLoading } = useQuery<OverdueLoan[]>({
    queryKey: ['overdueLoans'],
    queryFn: () => api.get('/loan/overdue').then(r => r.data),
  });

  const runCheck = useMutation({
    mutationFn: () => api.post('/loan/run-overdue-check').then(r => r.data),
    onSuccess: (data) => {
      setResult(`Done — ${data.newlyOverdue} newly overdue, ${data.newlyBlacklisted} newly blacklisted. ${data.totalOverdue} overdue total.`);
      qc.invalidateQueries({ queryKey: ['overdueLoans'] });
      qc.invalidateQueries({ queryKey: ['blacklisted'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (e: any) => setResult(e.response?.data?.message ?? 'Failed to run check.'),
  });

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <Header title="Overdue Loans" subtitle={`${loans.length} loan(s) requiring attention`} />

      {/* Manual check bar (Admin/Manager) */}
      {canRun && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="text-sm text-amber-800">
            Re-evaluate all active loans against their due dates and auto-blacklist 60+ day defaulters.
          </div>
          <button
            onClick={() => { setResult(''); runCheck.mutate(); }}
            disabled={runCheck.isPending}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            <RefreshCw size={15} className={runCheck.isPending ? 'animate-spin' : ''} />
            {runCheck.isPending ? 'Running…' : 'Run overdue check now'}
          </button>
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={15} /> {result}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : loans.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No overdue loans" sub="All loans are up to date" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Reference', 'Borrower', 'National ID', 'Amount', 'Due Date', 'Days Overdue', 'Risk Level'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map(loan => (
                  <tr key={loan.loanId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{loan.referenceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{loan.borrowerName}</p>
                      <p className="text-xs text-slate-400">{loan.borrowerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{loan.nationalId}</td>
                    <td className="px-4 py-3 font-medium text-red-600">{fmt(loan.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(loan.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${loan.daysOverdue > 60 ? 'text-red-600' : loan.daysOverdue > 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {loan.daysOverdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={loan.riskLevel} variant={riskVariant(loan.riskLevel)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
