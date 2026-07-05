import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { login, isAuthenticated, error, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/20 flex flex-col justify-center items-center p-6 relative overflow-hidden select-none">
      {/* Background soft ambient glowing clouds */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] top-[-10%] left-[-10%] pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-ai-purple/5 blur-[120px] bottom-[-10%] right-[-10%] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-white border border-neutral-200/60 rounded-2xl p-8 shadow-xl relative z-10">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-blue-500/10 mb-4">
            <span className="material-symbols-outlined font-semibold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              psychology
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none bg-gradient-to-r from-primary to-ai-purple bg-clip-text text-transparent">
            Deuglo AI Cockpit
          </h1>
          <p className="text-xs text-slate-500 mt-2 font-semibold">Enterprise Lead Intelligence Portal</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 leading-snug">
              ⚠️ Login Failed: {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">EMAIL ADDRESS</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 bg-slate-50 border border-slate-200/80 rounded-xl px-4 text-sm text-slate-800 focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              placeholder="admin@deuglo.ai"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">PASSWORD</label>
              <span className="text-[10px] text-primary font-bold hover:underline cursor-pointer">Forgot?</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 bg-slate-50 border border-slate-200/80 rounded-xl px-4 text-sm text-slate-800 focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-primary to-ai-purple text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
            ) : (
              <>
                <span className="material-symbols-outlined text-sm font-semibold">lock_open</span>
                Access Cockpit
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default LoginView;
