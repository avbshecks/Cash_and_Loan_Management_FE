'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FileText, Plus, X, Loader2, Search, CheckCircle, DollarSign, Sun } from 'lucide-react';
import api from '@/lib/api';
import { Loan, CreateLoanRequest, CaptureRepaymentRequest, Borrower } from '@/lib/types';
import Header from '@/components/Header';
import Badge, { statusVariant } from '@/components/Badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

export default function LoansPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDayLoan, setShowDayLoan] = useState(false);
  const [showQuickRepay, setShowQuickRepay] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: () => api.get('/loan/list').then(r => r.data).catch(() => []),
  });

  const repayableLoans = loans.filter(l => l.status === 'Active' || l.status === 'Overdue');

  const filtered = loans.filter(l =>
    l.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
    l.borrower?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <Header title="Loans" subtitle="All loan records" />

      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search loans or borrower..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 w-64"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuickRepay(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            <DollarSign size={16} /> Quick Repayment
          </button>
          <button
            onClick={() => setShowDayLoan(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            <Sun size={16} /> Day Loan
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            <Plus size={16} /> New Loan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No loans found" sub="Create a new loan to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Reference', 'Borrower', 'Amount', 'Remaining', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{loan.referenceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{loan.borrower?.fullName}</p>
                      <p className="text-xs text-slate-400">{loan.borrower?.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{fmt(loan.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmt(loan.remainingBalance ?? loan.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(loan.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge label={loan.status} variant={statusVariant(loan.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {(loan.status === 'Pending' || loan.status === 'Approved') && (
                          <Link
                            href="/pending-approvals"
                            className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md hover:bg-amber-200 transition font-medium"
                          >
                            {loan.status === 'Pending' ? 'Review' : 'Disburse'}
                          </Link>
                        )}
                        {(loan.status === 'Active' || loan.status === 'Overdue') && (
                          <button
                            onClick={() => setRepayLoan(loan)}
                            className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-md hover:bg-green-200 transition font-medium"
                          >
                            Repayment
                          </button>
                        )}
                        <Link
                          href={`/loans/${loan.id}`}
                          className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md hover:bg-slate-200 transition font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateLoanModal onClose={() => setShowCreate(false)} qc={qc} />}
      {showDayLoan && <DayLoanModal onClose={() => setShowDayLoan(false)} qc={qc} />}
      {repayLoan && <RepaymentModal loan={repayLoan} onClose={() => setRepayLoan(null)} qc={qc} />}
      {showQuickRepay && <QuickRepaymentModal loans={repayableLoans} onClose={() => setShowQuickRepay(false)} qc={qc} />}
    </div>
  );
}

// ─── Day Loan Modal (borrow now, repay this evening) ──────────────────────────
function DayLoanModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<{ amount: number; notes: string }>();
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Borrower | null>(null);
  const [showList, setShowList] = useState(false);

  const { data: allBorrowers = [] } = useQuery<Borrower[]>({
    queryKey: ['borrowers'],
    queryFn: () => api.get('/loan/borrowers').then(r => r.data),
  });
  const eligible = allBorrowers.filter(b => !b.isBlacklisted);
  const filtered = search.trim()
    ? eligible.filter(b => b.fullName.toLowerCase().includes(search.toLowerCase()) || b.nationalId.toLowerCase().includes(search.toLowerCase()))
    : eligible;

  const mut = useMutation({
    mutationFn: (amount: number) => api.post('/loan/day-loan', { borrowerId: selected!.id, amount }),
    onSuccess: (res) => { setOk(`${res.data.message} Ref: ${res.data.referenceNumber}`); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['balance'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <Modal title="New Day Loan" onClose={onClose}>
      {ok ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><CheckCircle size={15} /> {ok}</div>
          <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-800">
            Same-day loan — disbursed immediately and due by this evening. Repay via the borrower's loan when they return.
          </div>
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Borrower</label>
            {selected ? (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selected.fullName}</p>
                  <p className="text-xs text-slate-500">{selected.nationalId} · {selected.phone}</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setSearch(''); }} className="text-slate-400 hover:text-red-500 ml-3 text-xs">✕ Change</button>
              </div>
            ) : (
              <div className="relative">
                <input value={search} onChange={e => { setSearch(e.target.value); setShowList(true); }}
                  onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 150)}
                  placeholder="Search by name or National ID…"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                {showList && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filtered.slice(0, 20).map(b => (
                      <button key={b.id} type="button" onMouseDown={() => { setSelected(b); setShowList(false); setSearch(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0 transition">
                        <p className="text-sm font-medium text-slate-800">{b.fullName}</p>
                        <p className="text-xs text-slate-400">{b.nationalId} · {b.employmentStatus}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(d => { setErr(''); if (!selected) { setErr('Please select a borrower.'); return; } mut.mutate(Number(d.amount)); })} className="space-y-4">
            <MField label="Amount (USD)" type="number" step="0.01" {...register('amount', { required: true })} />
            <button type="submit" disabled={mut.isPending || !selected}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
              {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Issuing…</> : <><Sun size={15} /> Issue Day Loan</>}
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
}

// ─── Quick Repayment Modal (search & pick an active loan) ─────────────────────
function QuickRepaymentModal({ loans, onClose, qc }: { loans: Loan[]; onClose: () => void; qc: any }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Loan | null>(null);
  const [showList, setShowList] = useState(false);
  const { register, handleSubmit } = useForm<{ amount: number }>();
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filtered = search.trim()
    ? loans.filter(l =>
        l.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.borrower?.fullName?.toLowerCase().includes(search.toLowerCase()))
    : loans;

  const mut = useMutation({
    mutationFn: (amount: number) => api.post('/loan/repayment', { loanId: selected!.id, amount }),
    onSuccess: (res) => {
      setOk(`Repayment ${res.data.reference} recorded. Remaining: ${fmt(res.data.remainingBalance)}`);
      qc.invalidateQueries({ queryKey: ['loans'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <Modal title="Quick Repayment" onClose={onClose}>
      {ok ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            <CheckCircle size={15} /> {ok}
          </div>
          <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition">Close</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Loan selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Loan</label>
            {selected ? (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selected.borrower?.fullName}</p>
                  <p className="text-xs text-slate-500">{selected.referenceNumber} · Outstanding {fmt(selected.remainingBalance ?? selected.amount)}</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setSearch(''); }} className="text-slate-400 hover:text-red-500 ml-3 text-xs">✕ Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowList(true); }}
                  onFocus={() => setShowList(true)}
                  onBlur={() => setTimeout(() => setShowList(false), 150)}
                  placeholder="Search active loan by reference or borrower…"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                />
                {showList && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                    {filtered.map(l => (
                      <button key={l.id} type="button"
                        onMouseDown={() => { setSelected(l); setShowList(false); setSearch(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0 transition">
                        <p className="text-sm font-medium text-slate-800">{l.borrower?.fullName}</p>
                        <p className="text-xs text-slate-400">{l.referenceNumber} · Outstanding {fmt(l.remainingBalance ?? l.amount)}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showList && search.trim() && filtered.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-slate-400">No matching active loans.</div>
                )}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">{loans.length} active/overdue loan(s) available for repayment.</p>
          </div>

          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}

          <form onSubmit={handleSubmit(d => { setErr(''); if (!selected) { setErr('Please select a loan.'); return; } mut.mutate(Number(d.amount)); })} className="space-y-4">
            <MField label="Repayment Amount (USD)" type="number" step="0.01" {...register('amount', { required: true })} />
            <p className="text-xs text-slate-400">A repayment reference will be generated automatically.</p>
            <button type="submit" disabled={mut.isPending || !selected}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
              {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : 'Record Repayment'}
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
}

// ─── Create Loan Modal ────────────────────────────────────────────────────────
function CreateLoanModal({ onClose, qc }: { onClose: () => void; qc: any }) {
  const { register, handleSubmit, watch, setValue } = useForm<CreateLoanRequest & { borrowerSearch: string }>();
  const [err, setErr]           = useState('');
  const [search, setSearch]     = useState('');
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showDropdown, setShowDropdown]          = useState(false);

  // Fetch all eligible (non-blacklisted) borrowers
  const { data: allBorrowers = [], isLoading: loadingBorrowers } = useQuery<Borrower[]>({
    queryKey: ['borrowers'],
    queryFn: () => api.get('/loan/borrowers').then(r => r.data),
  });

  const eligible  = allBorrowers.filter(b => !b.isBlacklisted);
  const filtered  = search.trim()
    ? eligible.filter(b =>
        b.fullName.toLowerCase().includes(search.toLowerCase()) ||
        b.nationalId.toLowerCase().includes(search.toLowerCase())
      )
    : eligible;

  const mut = useMutation({
    mutationFn: (d: CreateLoanRequest) => api.post('/loan/create', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); onClose(); },
    onError:   (e: any) => setErr(e.response?.data?.message ?? 'Failed to create loan'),
  });

  const onSubmit = (d: any) => {
    setErr('');
    if (!selectedBorrower) { setErr('Please select a borrower.'); return; }
    mut.mutate({
      borrowerId:     selectedBorrower.id,
      amount:         Number(d.amount),
      repaymentTerms: d.repaymentTerms,
      dueDate:        d.dueDate,
    });
  };

  return (
    <Modal title="Create New Loan" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}

        {/* ── Borrower selector ── */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Borrower</label>

          {/* Selected borrower chip */}
          {selectedBorrower ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg px-3.5 py-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-800">{selectedBorrower.fullName}</p>
                <p className="text-xs text-slate-500">{selectedBorrower.nationalId} · {selectedBorrower.phone}</p>
              </div>
              <button type="button" onClick={() => { setSelectedBorrower(null); setSearch(''); }}
                className="text-slate-400 hover:text-red-500 ml-3 text-xs">✕ Change</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={loadingBorrowers ? 'Loading borrowers…' : 'Search by name or National ID…'}
                disabled={loadingBorrowers}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
              />
              {showDropdown && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filtered.slice(0, 20).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onMouseDown={() => { setSelectedBorrower(b); setSearch(''); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0 transition"
                    >
                      <p className="text-sm font-medium text-slate-800">{b.fullName}</p>
                      <p className="text-xs text-slate-400">{b.nationalId} · {b.employmentStatus}</p>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && search.trim() && filtered.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-slate-400">
                  No matching eligible borrowers found.
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">{eligible.length} eligible borrower(s). Blacklisted borrowers are excluded.</p>
        </div>

        <MField label="Loan Amount (USD)" type="number" step="0.01" min="1"
          {...register('amount', { required: true })} placeholder="0.00" />
        <MField label="Repayment Terms"
          {...register('repaymentTerms', { required: true })}
          placeholder="e.g. 3 months, weekly instalments" />
        <MField label="Due Date" type="date" {...register('dueDate', { required: true })} />

        <button type="submit" disabled={mut.isPending || !selectedBorrower}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
          {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Creating…</> : 'Create Loan'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Repayment Modal ──────────────────────────────────────────────────────────
function RepaymentModal({ loan, onClose, qc }: { loan: Loan; onClose: () => void; qc: any }) {
  const { register, handleSubmit } = useForm<CaptureRepaymentRequest>({ defaultValues: { loanId: loan.id } });
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: (d: CaptureRepaymentRequest) => api.post('/loan/repayment', d),
    onSuccess: (res) => { setOk(`Repayment recorded (Ref: ${res.data.reference}). Remaining: $${res.data.remainingBalance?.toLocaleString('en-US',{minimumFractionDigits:2})}`); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['balance'] }); },
    onError: (e: any) => setErr(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <Modal title={`Repayment — ${loan.referenceNumber}`} onClose={onClose}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800 mb-4">
        Borrower: <strong>{loan.borrower?.fullName}</strong> · Outstanding: <strong>${loan.remainingBalance?.toLocaleString('en-US',{minimumFractionDigits:2})}</strong>
      </div>
      {ok && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-3"><CheckCircle size={15} />{ok}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-3">{err}</div>}
      <form onSubmit={handleSubmit(d => { setOk(''); setErr(''); mut.mutate({ ...d, amount: Number(d.amount), loanId: loan.id }); })} className="space-y-4">
        <input type="hidden" {...register('loanId')} />
        <MField label="Amount (USD)" type="number" step="0.01" {...register('amount', { required: true })} />
        <p className="text-xs text-slate-400">A repayment reference will be generated automatically.</p>
        <button type="submit" disabled={mut.isPending} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
          {mut.isPending ? <><Loader2 size={15} className="animate-spin" /> Processing...</> : 'Record Repayment'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
import { forwardRef } from 'react';

const MField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input ref={ref} {...props} className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition" />
    </div>
  )
);
MField.displayName = 'MField';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
