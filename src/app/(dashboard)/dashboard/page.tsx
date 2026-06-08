'use client';

import { useQuery } from '@tanstack/react-query';
import { Wallet, FileText, AlertTriangle, ShieldOff, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';
import { CashBalance, LoanReport, DailyCashReport } from '@/lib/types';
import StatCard from '@/components/StatCard';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getStoredUser } from '@/lib/auth';

export default function DashboardPage() {
  const user = getStoredUser();

  const { data: balance } = useQuery<CashBalance>({
    queryKey: ['balance'],
    queryFn: () => api.get('/cash/balance').then(r => r.data),
  });

  const { data: loans } = useQuery<LoanReport>({
    queryKey: ['loanReport'],
    queryFn: () => api.get('/report/loans').then(r => r.data),
  });

  const { data: daily, isLoading: loadingDaily } = useQuery<DailyCashReport>({
    queryKey: ['dailyCash'],
    queryFn: () => api.get('/report/daily-cash').then(r => r.data),
  });

  const fmt = (n?: number) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const chartData = daily ? [
    { name: 'Opening',       amount: daily.openingBalance },
    { name: 'Additions',     amount: daily.totalAdditions },
    { name: 'Disbursements', amount: daily.totalDisbursements },
    { name: 'Balance',       amount: daily.currentBalance },
  ] : [];

  return (
    <div>
      <Header
        title={`Good day, ${user?.fullName?.split(' ')[0] ?? 'User'} 👋`}
        subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · CALM System`}
      />

      {/* Opening balance warning */}
      {daily && !daily.openingBalanceCaptured && (
        <div className="mb-5 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-3.5 text-sm flex items-center gap-2">
          <Activity size={16} className="flex-shrink-0" />
          <span>Opening balance for today has not been captured yet. <a href="/cash" className="font-semibold underline">Set it now →</a></span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cash Balance"      value={fmt(balance?.currentBalance)} icon={Wallet}        color="amber" sub="Current balance" />
        <StatCard label="Active Loans"      value={loans?.activeLoansCount ?? '—'}   icon={FileText}      color="blue"  sub={`${fmt(loans?.totalOutstandingBalance)} outstanding`} />
        <StatCard label="Overdue Loans"     value={loans?.overdueLoansCount ?? '—'}  icon={AlertTriangle} color="red"   sub={`${fmt(loans?.totalOverdueAmount)} at risk`} />
        <StatCard label="Blacklisted"       value={loans?.blacklistedBorrowersCount ?? '—'} icon={ShieldOff} color="slate" sub="Borrowers blocked" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Daily cash bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-700">Today's Cash Flow</h2>
          </div>
          {loadingDaily ? <LoadingSpinner /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Amount']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Loan summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-blue-500" />
            <h2 className="font-semibold text-slate-700">Loan Portfolio</h2>
          </div>
          {!loans ? <LoadingSpinner /> : (
            <div className="space-y-3">
              {[
                { label: 'Pending',  value: loans.pendingLoansCount,  color: 'bg-amber-400' },
                { label: 'Active',   value: loans.activeLoansCount,   color: 'bg-blue-400' },
                { label: 'Overdue',  value: loans.overdueLoansCount,  color: 'bg-red-400' },
                { label: 'Paid',     value: loans.paidLoansCount,     color: 'bg-green-400' },
              ].map(({ label, value, color }) => {
                const total = loans.pendingLoansCount + loans.activeLoansCount + loans.overdueLoansCount + loans.paidLoansCount || 1;
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total Outstanding</span>
                  <span className="font-semibold text-slate-700">{fmt(loans.totalOutstandingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Repaid</span>
                  <span className="font-semibold text-green-600">{fmt(loans.totalRepaidAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reconciliation status */}
      {daily && (
        <div className={`rounded-xl border px-5 py-4 text-sm flex items-center justify-between
          ${daily.reconciliation
            ? daily.reconciliation.status === 'Balanced'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
            : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
          <span className="font-medium">
            {daily.reconciliation
              ? `Reconciliation: ${daily.reconciliation.status} (Variance: $${daily.reconciliation.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
              : 'No reconciliation performed yet today'}
          </span>
          <a href="/cash" className="text-xs underline opacity-70 hover:opacity-100">Go to Cash →</a>
        </div>
      )}
    </div>
  );
}
