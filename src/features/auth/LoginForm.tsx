import React from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';

export const LoginForm: React.FC<{ onToggle: () => void }> = ({ onToggle }) => {
  const { setUser, showToast } = useApp();
  const { call, loading, error } = useApi({
    onSuccess: (data) => {
      setUser(data);
      showToast(`Welcome back, ${data.username}!`, 'success');
    },
    onError: (err) => showToast(err, 'error'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData)),
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
      <div className="space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-emerald-500/5 border-2 border-emerald-500/30 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group shadow-xl shadow-emerald-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
              <img src="https://pub-bc0d075e4ee24efcaa48a8fee3ff5518.r2.dev/assets/icon_loki" alt="Loki Icon" className="w-16 h-16 relative z-10 group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-emerald-500/20 rounded-full blur-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter">
              LOKI <span className="text-emerald-500">HUB</span>
            </h1>
            <p className="text-zinc-600 text-[11px] uppercase font-black tracking-[0.4em]">Precision API Management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Username" name="username" placeholder="Enter your username" required />
          <Input label="Password" name="password" type="password" placeholder="••••••••" required />
          
          {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}

          <Button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className="text-center pt-2">
          <button onClick={onToggle} className="text-xs font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest">
            Create an account
          </button>
        </div>
      </div>
    </Card>
  );
};
