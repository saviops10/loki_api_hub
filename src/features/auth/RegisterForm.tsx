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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">JOIN THE HUB</h1>
          <p className="text-zinc-500 text-sm">Start managing your APIs today.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" name="username" placeholder="Choose a username" required />
          <Input label="Password" name="password" type="password" placeholder="Create a password" required />
          
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
