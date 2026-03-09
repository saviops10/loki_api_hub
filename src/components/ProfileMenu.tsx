import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import { Button } from './Button';
import { Input } from './Input';

export const ProfileMenu: React.FC<{ onOpenAdmin?: () => void }> = ({ onOpenAdmin }) => {
  const { user, setUser, showToast } = useApp();
  const { call, loading } = useApi();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleLogout = async () => {
    await call('/api/auth/logout', { method: 'POST' });
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    const result = await call('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (result) {
      showToast('Password changed successfully', 'success');
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;

    const result = await call('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ fullName, email }),
    });

    if (result) {
      showToast('Profile updated!', 'success');
      setUser({ ...user!, full_name: fullName, email });
      setIsEditingProfile(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pl-4 bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 rounded-full transition-all group"
      >
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-white group-hover:text-loki-primary transition-colors">{user.username}</p>
          <p className="text-[10px] text-zinc-500">Account Settings</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-loki-primary to-loki-accent flex items-center justify-center text-zinc-950 font-black text-xs shadow-lg shadow-loki-primary/10">
          {user.username.slice(0, 2).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-zinc-800/50 to-transparent border-b border-zinc-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-loki-primary flex items-center justify-center text-zinc-950 font-black text-xl">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-none">{user.username}</h3>
                  <p className="text-xs text-zinc-500 mt-1">Loki API Hub Member</p>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-3 border border-zinc-800/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Your API Key</span>
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[10px] text-loki-primary hover:text-loki-accent font-bold"
                  >
                    {showApiKey ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono text-loki-accent flex-1 truncate">
                    {showApiKey ? user.api_key : '••••••••••••••••'}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(user.api_key!);
                      showToast('Copied to clipboard', 'success');
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2">
              {!isChangingPassword && !isEditingProfile ? (
                <div className="space-y-1">
                  {user.is_admin === 1 && onOpenAdmin && (
                    <button 
                      onClick={() => { onOpenAdmin(); setIsOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-loki-primary hover:text-loki-accent hover:bg-loki-primary/10 rounded-2xl transition-all"
                    >
                      <span className="text-lg">🛡️</span>
                      <span className="font-black uppercase tracking-widest text-xs">Admin Panel</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-2xl transition-all"
                  >
                    <span className="text-lg">👤</span>
                    <span className="font-medium">Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-2xl transition-all"
                  >
                    <span className="text-lg">🔐</span>
                    <span className="font-medium">Change Password</span>
                  </button>
                  <div className="h-px bg-zinc-800 my-2 mx-4" />
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl transition-all"
                  >
                    <span className="text-lg">🚪</span>
                    <span className="font-black uppercase tracking-widest text-xs">Sign Out</span>
                  </button>
                </div>
              ) : isEditingProfile ? (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white">Edit Profile</h4>
                    <button onClick={() => setIsEditingProfile(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
                  </div>
                  <form onSubmit={handleUpdateProfile} className="space-y-3">
                    <Input label="Full Name" name="fullName" defaultValue={user.full_name} required />
                    <Input label="Email" name="email" type="email" defaultValue={user.email} required />
                    <Button type="submit" className="w-full" isLoading={loading}>Save Changes</Button>
                  </form>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white">Change Password</h4>
                    <button onClick={() => setIsChangingPassword(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <Input label="Current Password" name="currentPassword" type="password" required />
                    <Input label="New Password" name="newPassword" type="password" required />
                    <Input label="Confirm New Password" name="confirmPassword" type="password" required />
                    <Button type="submit" className="w-full" isLoading={loading}>Update Password</Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
