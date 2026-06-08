import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'amber' | 'green' | 'red' | 'blue' | 'slate';
  sub?: string;
}

const colors = {
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  red:   'bg-red-50   text-red-600   border-red-200',
  blue:  'bg-blue-50  text-blue-600  border-blue-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

const iconBg = {
  amber: 'bg-amber-100 text-amber-600',
  green: 'bg-green-100 text-green-600',
  red:   'bg-red-100   text-red-600',
  blue:  'bg-blue-100  text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ label, value, icon: Icon, color, sub }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${colors[color]}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
