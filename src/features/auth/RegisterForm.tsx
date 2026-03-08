import React from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { LokiIcon } from '../../components/Branding';

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
    const data = Object.fromEntries(formData);
    
    if (data.password !== data.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    // Convert checkbox values to boolean
    const payload = {
      ...data,
      termsAccepted: formData.get('termsAccepted') === 'on',
      privacyAccepted: formData.get('privacyAccepted') === 'on',
    };

    call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto border-loki-primary/20 shadow-2xl shadow-loki-primary/10 bg-loki-bg/80 backdrop-blur-xl">
      <div className="space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-loki-primary/5 border-2 border-loki-primary/30 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group shadow-xl shadow-loki-primary/5">
              <div className="absolute inset-0 bg-gradient-to-br from-loki-primary/20 to-transparent opacity-50" />
              <LokiIcon className="w-16 h-16 relative z-10 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-loki-primary/20 rounded-full blur-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter">
              JOIN <span className="text-loki-accent">LOKI</span>
            </h1>
            <p className="text-zinc-600 text-[11px] uppercase font-black tracking-[0.4em]">Start Managing Your APIs</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <Input label="Full Name" name="fullName" placeholder="John Doe" required />
            <Input label="Professional Email" name="email" type="email" placeholder="john@company.com" required />
            <Input label="Username" name="username" placeholder="johndoe" required />
            <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            <Input label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" required />
          </div>
          
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-loki-accent/20 space-y-3 shadow-lg shadow-loki-accent/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-loki-accent">Security & Agreements</p>
            
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" name="termsAccepted" required className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-loki-primary focus:ring-loki-primary/20" />
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  I accept the <a href="#" className="text-loki-primary hover:underline">Terms of Use</a>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" name="privacyAccepted" required className="mt-1 w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-loki-primary focus:ring-loki-primary/20" />
                <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                  I accept the <a href="#" className="text-loki-primary hover:underline">Privacy Policy</a>
                </span>
              </label>
            </div>

            <div className="h-px bg-zinc-800/50 my-2" />
            
            <ul className="text-[10px] text-zinc-500 space-y-1 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-loki-primary" />
                Min. 8 chars, uppercase, lowercase, number & special char.
              </li>
            </ul>
          </div>

          <Button type="submit" className="w-full py-4 bg-loki-primary hover:bg-loki-accent text-zinc-950" isLoading={loading}>
            Create Account
          </Button>
        </form>

        <div className="text-center pt-2">
          <button onClick={onToggle} className="text-xs font-bold text-zinc-500 hover:text-loki-accent transition-colors uppercase tracking-widest">
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </Card>
  );
};
