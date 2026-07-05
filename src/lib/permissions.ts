// Role-rights matrix (mirrors backend [Authorize] attributes):
// Cashier    — transaction entry (cash, loans, safekeeping) + can REQUEST reversals + reports
// Accountant — accountant cash book only + can REQUEST reversals on their book + reports
// Auditor    — read-only + downloads
// Manager    — universal approvals (incl. reversal requests); no entry, no direct edit/reverse
// Finance Officer — read-only + downloads
// Admin      — everything (can also request and approve reversals directly)

export const canEntry      = (role?: string) => role === 'Admin' || role === 'Cashier';
export const canApprove    = (role?: string) => role === 'Admin' || role === 'Manager';
export const canAccountant = (role?: string) => role === 'Admin' || role === 'Accountant';

// Reversal is itself maker-checker now: Cashier/Accountant (or Admin) request it,
// Manager (or Admin) approves it. Nobody reverses directly/unilaterally except Admin
// via the same request+approve pipeline (Admin can do both steps).
export const canRequestReversal = (role?: string) => role === 'Admin' || role === 'Cashier' || role === 'Accountant';
export const canApproveReversal = (role?: string) => role === 'Admin' || role === 'Manager';
