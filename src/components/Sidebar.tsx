'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wallet, FileText, Users, AlertTriangle,
  ShieldOff, BarChart2, Bell, LogOut, Menu, X,
  UserCog, KeyRound, ClipboardCheck
} from 'lucide-react';
import { useState } from 'react';
import { clearAuth, getStoredUser } from '@/lib/auth';
import api from '@/lib/api';
import CalmLogo from './CalmLogo';

const navItems = [
  { href: '/dashboard',           label: 'Dashboard',         icon: LayoutDashboard, roles: [] as string[], badge: false },
  { href: '/pending-approvals',   label: 'Pending Approvals', icon: ClipboardCheck,  roles: [] as string[], badge: true  },
  { href: '/cash',                label: 'Cash Management',   icon: Wallet,          roles: [] as string[], badge: false },
  { href: '/loans',               label: 'Loans',             icon: FileText,        roles: [] as string[], badge: false },
  { href: '/borrowers',           label: 'Borrowers',         icon: Users,           roles: [] as string[], badge: false },
  { href: '/loans/overdue',       label: 'Overdue Loans',     icon: AlertTriangle,   roles: [] as string[], badge: false },
  { href: '/loans/blacklisted',   label: 'Blacklist',         icon: ShieldOff,       roles: [] as string[], badge: false },
  { href: '/reports',             label: 'Reports',           icon: BarChart2,       roles: [] as string[], badge: false },
  { href: '/notifications',       label: 'Notifications',     icon: Bell,            roles: [] as string[], badge: false },
  { href: '/users',               label: 'User Management',   icon: UserCog,         roles: ['Admin'],      badge: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const user = getStoredUser();

  // Live pending count for badge
  const { data: pendingData } = useQuery({
    queryKey: ['pendingCount'],
    queryFn: async () => {
      const [cash, loans] = await Promise.all([
        api.get('/cash/pending').then(r => r.data as any[]).catch(() => []),
        api.get('/loan/pending').then(r => r.data).catch(() => ({ pendingApproval: [], pendingDisbursement: [] })),
      ]);
      return cash.length + (loans.pendingApproval?.length ?? 0) + (loans.pendingDisbursement?.length ?? 0);
    },
    refetchInterval: 60_000,
    retry: false,
  });
  const pendingCount = pendingData ?? 0;

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-900 text-amber-400 p-2 rounded-lg shadow"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>

        {/* ── Brand header ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1 px-4 py-5 border-b border-slate-700">
          <div className="rounded-2xl overflow-hidden shadow-lg border-2 border-amber-500/30">
            <CalmLogo size={80} />
          </div>
          <p className="text-amber-400 font-extrabold text-xl tracking-[0.25em] mt-2">CALM</p>
          <p className="text-slate-300 text-xs font-medium text-center">Cash &amp; Liquidity Management</p>
          <p className="text-slate-500 text-[10px] text-center">Welble Investments P/L</p>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {navItems
            .filter(item => item.roles.length === 0 || item.roles.includes(user?.role ?? ''))
            .map(({ href, label, icon: Icon, badge }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${active
                      ? 'bg-amber-500 text-slate-900 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* ── User footer ──────────────────────────────────────────────── */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.fullName ?? 'User'}</p>
              <p className="text-slate-400 text-xs truncate">{user?.role ?? ''}</p>
            </div>
          </div>
          <Link href="/change-password"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-amber-400 text-sm transition-all mb-1">
            <KeyRound size={16} /> Change Password
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 text-sm transition-all">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
