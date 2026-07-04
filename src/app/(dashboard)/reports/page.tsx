'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2, FileText, ClipboardList, Calendar,
  TrendingUp, TrendingDown, DollarSign, Activity,
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle,
  Download, FileSpreadsheet, FileDown
} from 'lucide-react';
import { getToken } from '@/lib/auth';

// ─── Download helper ──────────────────────────────────────────────────────────
async function downloadReport(url: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { alert('Download failed. Please try again.'); return; }
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import api from '@/lib/api';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge, { statusVariant } from '@/components/Badge';
import { LoanReport } from '@/lib/types';

// ─── Currency formatter (USD) ─────────────────────────────────────────────────
const usd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = 'daily' | 'weekly' | 'monthly' | 'range' | 'loans' | 'audit';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('daily');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'daily',   label: 'Daily Cash',    icon: <DollarSign size={15} /> },
    { key: 'weekly',  label: 'Weekly Report',  icon: <Calendar size={15} /> },
    { key: 'monthly', label: 'Monthly Report', icon: <Calendar size={15} /> },
    { key: 'range',   label: 'Custom Range',   icon: <Calendar size={15} /> },
    { key: 'loans',   label: 'Loan Report',   icon: <FileText size={15} /> },
    { key: 'audit',   label: 'Audit Log',     icon: <ClipboardList size={15} /> },
  ];

  return (
    <div>
      <Header title="Reports" subtitle="Operational and management reports" />

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === t.key ? 'bg-amber-500 text-slate-900 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'daily'   && <DailyCashReport />}
      {tab === 'weekly'  && <WeeklyCashReport />}
      {tab === 'monthly' && <MonthlyCashReport />}
      {tab === 'range'   && <RangeCashReport />}
      {tab === 'loans'   && <LoanReportView />}
      {tab === 'audit'   && <AuditLogView />}
    </div>
  );
}

// ─── Daily Cash Report ────────────────────────────────────────────────────────
function DailyCashReport() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dailyCash', date],
    queryFn: () => api.get(`/report/daily-cash?date=${date}`).then(r => r.data),
    staleTime: 0,
  });

  const chartData = data ? [
    { name: 'Opening',  amount: data.openingBalance },
    { name: 'Added',    amount: data.totalAdditions },
    { name: 'Disbursed',amount: data.totalDisbursements },
    { name: 'Balance',  amount: data.currentBalance },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Date picker + downloads */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">Select Date:</span>
        <input type="date" value={date} max={today}
          onChange={e => setDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        <span className="text-xs text-slate-400 flex-1">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
        {/* Download buttons */}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => downloadReport(`/report/daily-cash/export?date=${date}&format=xlsx`, `CALM_DailyCash_${date}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={() => downloadReport(`/report/daily-cash/export?date=${date}&format=pdf`, `CALM_DailyCash_${date}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          Failed to load report. Please try again.
        </div>
      ) : (
        <>
          {/* Opening balance warning */}
          {!data.openingBalanceCaptured && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-3 text-sm">
              <AlertTriangle size={15} className="flex-shrink-0" />
              Opening balance was not explicitly captured for this date.
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Opening Balance',  value: usd(data.openingBalance),       icon: Activity,       bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
              { label: 'Cash Added',       value: usd(data.totalAdditions),       icon: TrendingUp,     bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
              { label: 'Cash Disbursed',   value: usd(data.totalDisbursements),   icon: TrendingDown,   bg: 'bg-red-50 border-red-200',     text: 'text-red-700' },
              { label: 'Closing Balance',  value: usd(data.currentBalance),       icon: DollarSign,     bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
            ].map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={text} />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                </div>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Chart + reconciliation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-amber-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Cash Flow Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${Number(v).toLocaleString()}`} />
                  <Tooltip formatter={(v) => [usd(Number(v)), 'Amount']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={15} className="text-green-500" />
                <h3 className="font-semibold text-slate-700 text-sm">Reconciliation</h3>
              </div>
              {data.reconciliation ? (
                <div className="space-y-3">
                  <div className={`rounded-lg px-4 py-3 text-sm font-semibold
                    ${data.reconciliation.status === 'Balanced'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {data.reconciliation.status}
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Actual Balance" value={usd(data.reconciliation.actualEndBalance)} />
                    <Row label="System Balance" value={usd(data.currentBalance)} />
                    <Row label="Variance"
                      value={usd(data.reconciliation.variance)}
                      valueClass={data.reconciliation.variance !== 0 ? 'text-red-600 font-semibold' : 'text-green-600'} />
                  </div>
                  {data.reconciliation.comment && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">{data.reconciliation.comment}</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity size={28} strokeWidth={1.2} className="mx-auto mb-2" />
                  <p className="text-sm">No reconciliation yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction list */}
          {data.transactions?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Activity size={15} className="text-slate-400" />
                <h3 className="font-semibold text-slate-700 text-sm">{data.transactionCount} Transaction{data.transactionCount !== 1 ? 's' : ''} on {date}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Time', 'Type', 'Amount', 'Source / Purpose', 'Reference', 'By'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(t.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                            ${t.type === 'Addition' ? 'bg-green-100 text-green-700'
                              : t.type === 'OpeningBalance' ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'}`}>
                            {t.type === 'OpeningBalance' ? 'Opening' : t.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-semibold ${t.type === 'Disbursement' ? 'text-red-600' : 'text-green-600'}`}>
                          {t.type === 'Disbursement' ? '-' : '+'}{usd(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{t.sourceOrPurpose}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.reference}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.transactions?.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400">
              <Activity size={32} strokeWidth={1.2} className="mx-auto mb-2" />
              <p className="text-sm">No transactions recorded on this date</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Monthly Cash Report ──────────────────────────────────────────────────────
// ─── Weekly Cash Report ───────────────────────────────────────────────────────
function WeeklyCashReport() {
  // anchorDate = any date inside the displayed week
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weeklyCash', anchorDate],
    queryFn: () => api.get(`/report/weekly-cash?date=${anchorDate}`).then(r => r.data),
    staleTime: 0,
  });

  const shiftWeek = (deltaDays: number) => {
    const d = new Date(anchorDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setAnchorDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-5">
      {/* Week selector + downloads */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <button onClick={() => shiftWeek(-7)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition">
          <ChevronLeft size={18} />
        </button>
        <span className="text-base font-semibold text-slate-800 min-w-[200px] text-center">
          {data?.label ?? '…'}
        </span>
        <button onClick={() => shiftWeek(7)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition">
          <ChevronRight size={18} />
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => downloadReport(`/report/weekly-cash/export?date=${anchorDate}&format=xlsx`, `CALM_Weekly_${data?.weekStart ?? anchorDate}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={() => downloadReport(`/report/weekly-cash/export?date=${anchorDate}&format=pdf`, `CALM_Weekly_${data?.weekStart ?? anchorDate}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">Failed to load.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Added',     value: usd(data.totalAdditions),          text: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
              { label: 'Total Disbursed', value: usd(data.totalDisbursements),      text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
              { label: 'Net Cash Flow',   value: usd(data.netCashFlow),             text: data.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700', bg: data.netCashFlow >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
              { label: 'Loans Issued',    value: `${data.newLoansCount} loans`,     text: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
              { label: 'Repayments In',   value: usd(data.totalRepaymentsCollected),text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
              { label: 'Active Days',     value: `${data.activeDays} / 7`,          text: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
            ].map(({ label, value, text, bg }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Day-by-day table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">Day-by-Day Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Date', 'Day', 'Cash In', 'Cash Out', 'Net', 'Transactions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.days.map((d: any) => (
                    <tr key={d.date} className={`hover:bg-slate-50 transition ${d.txnCount === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{d.dayOfWeek.slice(0, 3)}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{d.additions > 0 ? usd(d.additions) : '—'}</td>
                      <td className="px-4 py-2.5 text-red-600 font-medium">{d.disbursements > 0 ? usd(d.disbursements) : '—'}</td>
                      <td className={`px-4 py-2.5 font-semibold ${d.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {d.net !== 0 ? `${d.net > 0 ? '+' : ''}${usd(d.net)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{d.txnCount > 0 ? d.txnCount : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-green-700 font-bold">{usd(data.totalAdditions)}</td>
                    <td className="px-4 py-3 text-red-700 font-bold">{usd(data.totalDisbursements)}</td>
                    <td className={`px-4 py-3 font-bold ${data.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {data.netCashFlow > 0 ? '+' : ''}{usd(data.netCashFlow)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{data.days.reduce((s: number, d: any) => s + d.txnCount, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyCashReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthlyCash', year, month],
    queryFn: () => api.get(`/report/monthly-cash?year=${year}&month=${month}`).then(r => r.data),
    staleTime: 0,
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="space-y-5">
      {/* Month selector + downloads */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition">
          <ChevronLeft size={18} />
        </button>
        <span className="text-base font-semibold text-slate-800 min-w-[160px] text-center">
          {months[month - 1]} {year}
        </span>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => downloadReport(`/report/monthly-cash/export?year=${year}&month=${month}&format=xlsx`, `CALM_Monthly_${year}${String(month).padStart(2,'0')}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={() => downloadReport(`/report/monthly-cash/export?year=${year}&month=${month}&format=pdf`, `CALM_Monthly_${year}${String(month).padStart(2,'0')}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">Failed to load.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Added',      value: usd(data.totalAdditions),            text: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
              { label: 'Total Disbursed',  value: usd(data.totalDisbursements),         text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
              { label: 'Net Cash Flow',    value: usd(data.netCashFlow),                text: data.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700', bg: data.netCashFlow >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
              { label: 'Loans Issued',     value: `${data.newLoansCount} loans`,        text: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
              { label: 'Repayments In',    value: usd(data.totalRepaymentsCollected),   text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
              { label: 'Active Days',      value: `${data.activeDays} / ${data.days?.length ?? 30}`, text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            ].map(({ label, value, text, bg }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Daily breakdown chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={15} className="text-amber-500" />
              <h3 className="font-semibold text-slate-700 text-sm">Daily Cash Flow — {data.monthName}</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.days} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={d => new Date(d + 'T00:00:00').getDate().toString()}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${Number(v) >= 1000 ? (Number(v)/1000).toFixed(0)+'k' : v}`} />
                <Tooltip
                  labelFormatter={d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  formatter={(v, name) => [usd(Number(v)), name === 'additions' ? 'Added' : 'Disbursed']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend formatter={v => v === 'additions' ? 'Cash In' : 'Cash Out'} iconSize={10} />
                <Bar dataKey="additions"    fill="#10b981" radius={[3, 3, 0, 0]} name="additions" />
                <Bar dataKey="disbursements" fill="#ef4444" radius={[3, 3, 0, 0]} name="disbursements" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day-by-day table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">Day-by-Day Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Date', 'Day', 'Cash In', 'Cash Out', 'Net', 'Transactions'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.days.map((d: any) => (
                    <tr key={d.date} className={`hover:bg-slate-50 transition ${d.txnCount === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{d.dayOfWeek.slice(0, 3)}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{d.additions > 0 ? usd(d.additions) : '—'}</td>
                      <td className="px-4 py-2.5 text-red-600 font-medium">{d.disbursements > 0 ? usd(d.disbursements) : '—'}</td>
                      <td className={`px-4 py-2.5 font-semibold ${d.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {d.net !== 0 ? `${d.net > 0 ? '+' : ''}${usd(d.net)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{d.txnCount > 0 ? d.txnCount : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-green-700 font-bold">{usd(data.totalAdditions)}</td>
                    <td className="px-4 py-3 text-red-700 font-bold">{usd(data.totalDisbursements)}</td>
                    <td className={`px-4 py-3 font-bold ${data.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {data.netCashFlow > 0 ? '+' : ''}{usd(data.netCashFlow)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{data.days.reduce((s: number, d: any) => s + d.txnCount, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Custom Range Cash Report ─────────────────────────────────────────────────
function RangeCashReport() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);

  const valid = from && to && from <= to;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rangeCash', from, to],
    queryFn: () => api.get(`/report/range-cash?from=${from}&to=${to}`).then(r => r.data),
    enabled: !!valid,
    staleTime: 0,
  });

  return (
    <div className="space-y-5">
      {/* Range picker + downloads */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-slate-600">From:</span>
        <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        <span className="text-sm font-medium text-slate-600">To:</span>
        <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        <div className="flex gap-2 ml-auto">
          <button disabled={!valid} onClick={() => downloadReport(`/report/range-cash/export?from=${from}&to=${to}&format=xlsx`, `CALM_Cash_${from}_${to}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition disabled:opacity-50">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button disabled={!valid} onClick={() => downloadReport(`/report/range-cash/export?from=${from}&to=${to}&format=pdf`, `CALM_Cash_${from}_${to}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition disabled:opacity-50">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {!valid ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-5 py-4 text-sm">Select a valid date range (From must be on or before To).</div>
      ) : isLoading ? <LoadingSpinner /> : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          {(error as any)?.response?.data?.message ?? 'Failed to load.'}
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Added',     value: usd(data.totalAdditions),          text: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
              { label: 'Total Disbursed', value: usd(data.totalDisbursements),      text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
              { label: 'Net Cash Flow',   value: usd(data.netCashFlow),             text: data.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700', bg: data.netCashFlow >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
              { label: 'Loans Issued',    value: `${data.newLoansCount} loans`,     text: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
              { label: 'Repayments In',   value: usd(data.totalRepaymentsCollected),text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
              { label: 'Active Days',     value: `${data.activeDays} / ${data.days.length}`, text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
            ].map(({ label, value, text, bg }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">Day-by-Day Breakdown — {data.label}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Date', 'Day', 'Cash In', 'Cash Out', 'Net', 'Transactions'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.days.map((d: any) => (
                    <tr key={d.date} className={`hover:bg-slate-50 transition ${d.txnCount === 0 ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{d.dayOfWeek.slice(0, 3)}</td>
                      <td className="px-4 py-2.5 text-green-600 font-medium">{d.additions > 0 ? usd(d.additions) : '—'}</td>
                      <td className="px-4 py-2.5 text-red-600 font-medium">{d.disbursements > 0 ? usd(d.disbursements) : '—'}</td>
                      <td className={`px-4 py-2.5 font-semibold ${d.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {d.net !== 0 ? `${d.net > 0 ? '+' : ''}${usd(d.net)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{d.txnCount > 0 ? d.txnCount : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Loan Report ──────────────────────────────────────────────────────────────
function LoanReportView() {
  const today = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const exportQs = (format: string) =>
    period === 'custom'
      ? `/report/loans/period/export?from=${from}&to=${to}&format=${format}`
      : `/report/loans/period/export?period=${period}&date=${today}&format=${format}`;
  const validRange = period !== 'custom' || (from && to && from <= to);

  const { data, isLoading, isError } = useQuery<LoanReport & { recentLoans: any[] }>({
    queryKey: ['loanReport'],
    queryFn: () => api.get('/report/loans').then(r => r.data),
    staleTime: 0,
  });

  return (
    <div className="space-y-5">
      {/* Period export toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Period report:</span>
        <select value={period} onChange={e => setPeriod(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
        {period === 'custom' && (
          <>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
          </>
        )}
        <div className="flex gap-2 ml-auto">
          <button disabled={!validRange} onClick={() => downloadReport(exportQs('xlsx'), `CALM_Loans_${period}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition disabled:opacity-50">
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button disabled={!validRange} onClick={() => downloadReport(exportQs('pdf'), `CALM_Loans_${period}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition disabled:opacity-50">
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">Failed to load.</div>
      ) : !data ? null : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending',       value: data.pendingLoansCount,          sub: 'Awaiting approval',       bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-700' },
              { label: 'Active',        value: data.activeLoansCount,           sub: usd(data.totalOutstandingBalance), bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
              { label: 'Overdue',       value: data.overdueLoansCount,          sub: usd(data.totalOverdueAmount),  bg: 'bg-red-50 border-red-200',    text: 'text-red-700' },
              { label: 'Paid Off',      value: data.paidLoansCount,             sub: usd(data.totalRepaidAmount) + ' recovered', bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
              { label: 'Blacklisted',   value: data.blacklistedBorrowersCount,  sub: 'Borrowers blocked',        bg: 'bg-slate-50 border-slate-200',  text: 'text-slate-700' },
              { label: 'Outstanding',   value: usd(data.totalOutstandingBalance), sub: 'Active + overdue',       bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
              { label: 'Total Repaid',  value: usd(data.totalRepaidAmount),     sub: 'All time',                 bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
              { label: 'At Risk',       value: usd(data.totalOverdueAmount),    sub: 'Overdue balance',          bg: 'bg-rose-50 border-rose-200',    text: 'text-rose-700' },
            ].map(({ label, value, sub, bg, text }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold ${text}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Recent loans */}
          {data.recentLoans?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">Recent Loans</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Reference', 'Borrower', 'Amount', 'Due Date', 'Status', 'Created'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recentLoans.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{l.referenceNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{l.borrowerName}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{usd(l.amount)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(l.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><Badge label={l.status} variant={statusVariant(l.status)} /></td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(l.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLogView() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (from) params.set('from', from);
  if (to)   params.set('to', to);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditLog', page, from, to],
    queryFn: () => api.get(`/report/audit?${params}`).then(r => r.data),
    staleTime: 0,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">From:</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 font-medium">To:</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); setPage(1); }}
            className="text-xs text-slate-500 hover:text-red-500 transition">Clear filters</button>
        )}
        {data && <span className="text-xs text-slate-400 ml-auto">{data.total.toLocaleString()} total records</span>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : isError ? (
          <div className="px-5 py-6 text-sm text-red-600">Failed to load audit log.</div>
        ) : data?.logs?.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <ClipboardList size={32} strokeWidth={1.2} className="mx-auto mb-2" />
            <p className="text-sm">No audit records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Timestamp', 'User', 'Action', 'IP Address'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{log.user}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-lg">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Row({ label, value, valueClass = 'text-slate-700' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
