// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  username: string;
  fullName: string;
  role: string;
  expiresAt: string;
  mustChangePassword: boolean;
  passwordExpired: boolean;
}

export interface CurrentUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface SystemUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  passwordExpired: boolean;
  role: { id: number; name: string };
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

// ─── Cash ────────────────────────────────────────────────────────────────────
export interface CashBalance {
  currentBalance: number;
  currency?: string;
  pendingDisbursements?: number;
  initialized?: boolean;
}

export interface CashLedgerEntry {
  id: number;
  date: string;
  amount: number;
  type: string;
  status: string;
  sourceOrPurpose: string;
  reference: string;
  rejectionReason?: string | null;
  isReversed: boolean;
  isReversal: boolean;
  reversalStatus?: string | null;   // null | "Pending" | "Approved" | "Rejected"
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface PendingReversal {
  id: number;
  date: string;
  amount: number;
  type: string;
  sourceOrPurpose: string;
  reference: string;
  reversalReason: string;
  reversalRequestedAt: string;
  requestedBy: string;
  originalPostedBy: string;
}

export interface AddCashRequest {
  amount: number;
  source: string;
  reference: string;
}

export interface DisburseCashRequest {
  amount: number;
  recipient: string;
  purpose: string;
  reference: string;
}

export interface ReconcileRequest {
  openingBalance: number;
  actualEndBalance: number;
  comment: string;
}

export interface OpeningBalanceRequest {
  amount: number;
  notes?: string;
}

// ─── Borrowers ───────────────────────────────────────────────────────────────
export interface Borrower {
  id: number;
  fullName: string;
  nationalId: string;
  phone: string;
  address: string;
  employmentStatus: string;
  guarantorDetails?: string;
  isBlacklisted: boolean;
}

export interface CreateBorrowerRequest {
  fullName: string;
  nationalId: string;
  phone: string;
  address: string;
  employmentStatus: string;
  guarantorDetails?: string;
}

// ─── Loans ───────────────────────────────────────────────────────────────────
export type LoanStatus = 'Pending' | 'Approved' | 'Active' | 'Paid' | 'Overdue' | 'Defaulted' | 'Blacklisted';

export interface Loan {
  id: number;
  referenceNumber: string;
  amount: number;
  repaymentTerms: string;
  dueDate: string;
  status: LoanStatus;
  createdAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  totalRepaid: number;
  remainingBalance: number;
  borrower: { id: number; fullName: string; nationalId: string; phone: string };
  createdBy: string;
  approvedBy?: string;
  repayments: { id: number; amount: number; repaymentDate: string; reference: string }[];
}

export interface CreateLoanRequest {
  borrowerId: number;
  amount: number;
  repaymentTerms: string;
  dueDate: string;
}

export interface OverdueLoan {
  loanId: number;
  referenceNumber: string;
  borrowerName: string;
  borrowerPhone: string;
  nationalId: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  riskLevel: string;
}

export interface BlacklistedBorrower {
  borrowerId: number;
  name: string;
  nationalId: string;
  phone: string;
  blacklistedReason: string;
  blacklistedAt: string;
  blacklistedBy: string;
}

export interface CaptureRepaymentRequest {
  loanId: number;
  amount: number;
  reference: string;
}

// ─── Pending Approvals ───────────────────────────────────────────────────────
export interface PendingCashDisbursement {
  id: number;
  date: string;
  amount: number;
  sourceOrPurpose: string;
  reference: string;
  requestedBy: string;
  approvalStatus: string;
}

export interface PendingLoan {
  id: number;
  referenceNumber: string;
  amount: number;
  repaymentTerms: string;
  dueDate: string;
  borrowerName: string;
  borrowerNationalId: string;
  createdBy?: string;
  approvedBy?: string;
  createdAt?: string;
  approvedAt?: string;
  stage: string;
}

export interface UpdateBorrowerRequest {
  phone?: string;
  address?: string;
  employmentStatus?: string;
  guarantorDetails?: string;
}

// ─── Safekeeping ─────────────────────────────────────────────────────────────
export interface SafekeepingAccountSummary {
  id: number;
  depositorName: string;
  phone: string;
  nationalId?: string;
  isActive: boolean;
  createdAt: string;
  balance: number;
  totalDeposited: number;
  totalCollected: number;
  lastActivity?: string | null;
}

export interface SafekeepingStatementEntry {
  id: number;
  date: string;
  type: string;
  status: string;
  amount: number;
  reference: string;
  notes?: string | null;
  rejectionReason?: string | null;
  balanceAfter: number;
  capturedBy: string;
}

export interface PendingSafekeepingWithdrawal {
  id: number;
  date: string;
  amount: number;
  reference: string;
  notes?: string | null;
  accountId: number;
  depositorName: string;
  requestedBy: string;
}

export interface SafekeepingAccountDetail {
  id: number;
  depositorName: string;
  phone: string;
  nationalId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  openedBy: string;
  dateFirstLeft?: string | null;
  lastCollection?: string | null;
  totalDeposited: number;
  totalCollected: number;
  pendingCollections: number;
  currentBalance: number;
  transactionCount: number;
  statement: SafekeepingStatementEntry[];
}

// ─── Accountant book ─────────────────────────────────────────────────────────
export interface AccountantLedgerEntry {
  id: number;
  date: string;
  amount: number;
  type: string;
  sourceOrPurpose: string;
  reference: string;
  createdBy: string;
  isReversed: boolean;
  isReversal: boolean;
  reversalStatus?: string | null;
}

export interface AccountantDailyReport {
  date: string;
  openingBalance: number;
  totalAdded: number;
  totalDisbursed: number;
  closingBalance: number;
  transactions: AccountantLedgerEntry[];
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface DailyCashReport {
  date: string;
  openingBalanceCaptured: boolean;
  openingBalance: number;
  totalAdditions: number;
  totalDisbursements: number;
  currentBalance: number;
  reconciliation?: {
    actualEndBalance: number;
    variance: number;
    status: string;
  };
}

export interface LoanReport {
  activeLoansCount: number;
  pendingLoansCount: number;
  overdueLoansCount: number;
  paidLoansCount: number;
  blacklistedBorrowersCount: number;
  totalOutstandingBalance: number;
  totalRepaidAmount: number;
  totalOverdueAmount: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  ipAddress: string;
}

export interface AuditReport {
  total: number;
  page: number;
  pageSize: number;
  logs: AuditLog[];
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
