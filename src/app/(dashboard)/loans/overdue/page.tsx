'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { OverdueLoan } from '@/lib/types';
import Header from '@/components/Header';
import Badge, { riskVariant } from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

export default function OverdueLoansPage() {
  const { data: loans = [], isLoading } = useQuery<OverdueLoan[]>({
    queryKey: ['overdueLoans'],
    queryFn: () => api.get('/loan/overdue').then(r => r.data),
  });

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <Header title="Overdue Loans" subtitle={`${loans.length} loan(s) requiring attention`} />

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
