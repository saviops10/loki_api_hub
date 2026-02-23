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
    <Card className="w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">SMART API HUB</h1>
          <p className="text-zinc-500 text-sm">Manage your integrations with precision.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" name="username" placeholder="admin" required />
          <Input label="Password" name="password" type="password" placeholder="••••••••" required />
          
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <Button type="submit" className="w-full" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className="text-center">
          <button onClick={onToggle} className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
            Don't have an account? Register here
          </button>
        </div>
      </div>
    </Card>
  );
};
