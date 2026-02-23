import React from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';

export const RegisterForm: React.FC<{ onToggle: () => void }> = ({ onToggle }) => {
  const { showToast } = useApp();
  const { call, loading, error } = useApi({
    onSuccess: () => {
      showToast('Account created! You can now login.', 'success');
      onToggle();
    },
    onError: (err) => showToast(err, 'error'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData)),
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
              <span className="text-4xl relative z-10 group-hover:scale-110 transition-transform duration-500">🐍</span>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-500/20 rounded-full blur-xl" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter">
              L.O.K.I <span className="text-emerald-500">API HUB</span>
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em]">Join the Precision Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" name="username" placeholder="Choose a username" required />
          <div className="space-y-1">
            <Input label="Password" name="password" type="password" placeholder="Create a password" required />
            <p className="text-[10px] text-zinc-500 leading-tight">
              Min. 8 chars, uppercase, lowercase, number, and special char.
            </p>
          </div>
          
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="text-center">
          <button onClick={onToggle} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            Already have an account? Login here
          </button>
        </div>
      </div>
    </Card>
  );
};
