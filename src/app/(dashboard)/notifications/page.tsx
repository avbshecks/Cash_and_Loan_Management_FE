'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, AlertTriangle, Wallet, FileText, ShieldOff, ClipboardCheck } from 'lucide-react';
import api from '@/lib/api';
import { Notification } from '@/lib/types';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';

const typeIcon: Record<string, React.ReactNode> = {
  OverdueLoan:            <AlertTriangle size={15} className="text-red-500" />,
  LowCashBalance:         <Wallet size={15} className="text-amber-500" />,
  ReconciliationVariance: <ClipboardCheck size={15} className="text-orange-500" />,
  PendingApproval:        <FileText size={15} className="text-blue-500" />,
  BlacklistAttempt:       <ShieldOff size={15} className="text-red-500" />,
  FailedLogin:            <Bell size={15} className="text-slate-500" />,
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/report/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.post(`/report/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div>
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
      />

      {isLoading ? <LoadingSpinner /> : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={Bell} title="No notifications" sub="You're all caught up" />
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border px-5 py-4 flex items-start gap-4 transition
                ${n.isRead ? 'border-slate-200 opacity-70' : 'border-amber-300 shadow-sm'}`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {typeIcon[n.type] ?? <Bell size={15} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className={`font-medium text-sm ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</p>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead.mutate(n.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition"
                  title="Mark as read"
                >
                  <Check size={13} className="text-green-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
