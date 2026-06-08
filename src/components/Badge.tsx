type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'slate';

const styles: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red:   'bg-red-100   text-red-700',
  blue:  'bg-blue-100  text-blue-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Active':   return 'green';
    case 'Paid':     return 'blue';
    case 'Pending':  return 'amber';
    case 'Overdue':  return 'red';
    case 'Approved': return 'green';
    case 'Defaulted':
    case 'Blacklisted': return 'red';
    default: return 'slate';
  }
}

export function riskVariant(risk: string): BadgeVariant {
  if (risk.startsWith('Critical')) return 'red';
  if (risk === 'High Risk') return 'amber';
  return 'slate';
}

export default function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {label}
    </span>
  );
}
