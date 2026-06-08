'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { AuthResponse, LoginRequest } from '@/lib/types';
import CalmLogo from '@/components/CalmLogo';

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', data);
      saveAuth(res.data);
      if (res.data.mustChangePassword || res.data.passwordExpired) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] bg-slate-900 p-10">

        {/* Logo + company */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-3xl overflow-hidden shadow-xl border-2 border-amber-400/40">
            <CalmLogo size={110} />
          </div>
          <p className="text-slate-400 text-xs tracking-widest uppercase mt-1">Welble Investments P/L</p>
          <p className="text-slate-500 text-[10px]">Innovation, Excellence &amp; Sustainability</p>
        </div>

        {/* System identity */}
        <div className="text-center">
          <p className="text-amber-400 font-black text-6xl tracking-widest mb-3">CALM</p>
          <p className="text-white text-xl font-semibold mb-4">Cash &amp; Liquidity Management</p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Real-time visibility into cash flow, loan management, daily reconciliation
            and financial accountability — built for mining operations.
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-10 text-slate-500 text-xs">
          <div className="text-center"><p className="text-white font-bold text-2xl">100%</p><p>Audit Tracked</p></div>
          <div className="text-center"><p className="text-white font-bold text-2xl">5</p><p>Role Levels</p></div>
          <div className="text-center"><p className="text-white font-bold text-2xl">Live</p><p>Reports</p></div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
            <div className="rounded-2xl overflow-hidden shadow-md border border-amber-400/30">
              <CalmLogo size={72} />
            </div>
            <p className="text-amber-500 font-black text-2xl tracking-widest">CALM</p>
            <p className="text-slate-500 text-xs">Cash &amp; Liquidity Management</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-slate-800 mb-1">Sign in</h1>
            <p className="text-slate-500 text-sm mb-6">Enter your credentials to access CALM</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <input
                  {...register('username', { required: 'Username is required' })}
                  autoComplete="username"
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                  placeholder="Enter your username"
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition pr-10"
                    placeholder="Enter your password"
                  />
                  <button type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <div className="flex items-center gap-2 mt-5 text-xs text-slate-400">
              <ShieldCheck size={13} className="text-amber-400 flex-shrink-0" />
              Secured with JWT authentication &amp; role-based access control
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            CALM &copy; {new Date().getFullYear()} &mdash; Welble Investments P/L
          </p>
        </div>
      </div>
    </div>
  );
}
