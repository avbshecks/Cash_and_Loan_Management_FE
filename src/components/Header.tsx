'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-xs font-bold text-amber-500 tracking-widest bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
          CALM
        </span>
        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <Bell size={20} />
        </Link>
      </div>
    </header>
  );
}
