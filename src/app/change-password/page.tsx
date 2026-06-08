'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import CalmLogo from '@/components/CalmLogo';
import api from '@/lib/api';
import { clearAuth } from '@/lib/auth';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const newPass = watch('newPassword');

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      // Clear session — user must log in fresh with new password
      clearAuth();
      router.push('/login?changed=1');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="rounded-xl overflow-hidden shadow border border-slate-200 mb-1">
              <CalmLogo size={60} />
            </div>
            <p className="text-amber-500 font-black text-lg tracking-widest mb-1">CALM</p>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <KeyRound size={18} className="text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Change Your Password</h1>
            <p className="text-slate-500 text-sm text-center mt-1">
              Your password needs to be updated before you can continue.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-6 flex items-start gap-2">
            <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
            <span>Choose a strong password with at least 8 characters. You'll be asked to log in again after changing it.</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  {...register('currentPassword', { required: 'Current password is required' })}
                  type={showCurrent ? 'text' : 'password'}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 pr-10 transition"
                  placeholder="Your current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Must be at least 8 characters' },
                  })}
                  type={showNew ? 'text' : 'password'}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 pr-10 transition"
                  placeholder="New password (min 8 characters)"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your new password',
                  validate: v => v === newPass || 'Passwords do not match',
                })}
                type="password"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 transition"
                placeholder="Re-enter new password"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading ? <><Loader2 size={15} className="animate-spin" />Changing...</> : 'Change Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
