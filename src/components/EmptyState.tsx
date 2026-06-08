import { LucideIcon } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
      <Icon size={40} strokeWidth={1.2} />
      <p className="font-medium text-slate-500">{title}</p>
      {sub && <p className="text-sm">{sub}</p>}
    </div>
  );
}
