import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/Feedback';
import { ProfileMenu } from '../../components/ProfileMenu';

type AdminTab = 'users' | 'apis' | 'system';

export const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, showToast } = useApp();
  const { call, loading } = useApi();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);

  const fetchData = async () => {
    if (activeTab === 'users') {
      const data = await call('/api/admin/users');
      if (data) setUsers(data);
    } else if (activeTab === 'apis') {
      const data = await call('/api/admin/apis');
      if (data) setApis(data);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const toggleAdmin = async (userId: number, currentStatus: number) => {
    const result = await call(`/api/admin/users/${userId}/toggle-admin`, {
      method: 'POST',
      body: JSON.stringify({ isAdmin: currentStatus === 1 ? 0 : 1 })
    });
    if (result) {
      showToast('User permissions updated', 'success');
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900/50 border-b border-zinc-800 p-4 sm:px-8 flex justify-between items-center backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
              <span className="text-emerald-500">LOKI</span> ADMIN
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500">System Management</p>
          </div>
        </div>
        <ProfileMenu />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-zinc-900/20 border-r border-zinc-800 p-6 space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600 mb-4 px-2">Resources</p>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'users' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>👥</span> Users
          </button>
          <button 
            onClick={() => setActiveTab('apis')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'apis' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>🔌</span> APIs
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'system' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>⚡</span> System Status
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                  {activeTab === 'users' ? 'User Management' : activeTab === 'apis' ? 'API Inventory' : 'Cloudflare Stack'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {activeTab === 'users' ? 'Manage system users and their permissions.' : activeTab === 'apis' ? 'Overview of all registered APIs across the platform.' : 'Real-time status of Cloudflare infrastructure.'}
                </p>
              </div>
              <Button variant="secondary" onClick={fetchData} size="sm">Refresh</Button>
            </div>

            {loading ? (
              <LoadingSpinner label="Loading data..." />
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'users' && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">User</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Email</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black text-white">
                                  {u.username.slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{u.username}</p>
                                  <p className="text-[10px] text-zinc-500">{u.full_name || 'No full name'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">{u.email}</td>
                            <td className="px-6 py-4">
                              {u.is_admin === 1 ? (
                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-emerald-500/20">Admin</span>
                              ) : (
                                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-zinc-700">User</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => toggleAdmin(u.id, u.is_admin)}
                                className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                              >
                                {u.is_admin === 1 ? 'Demote' : 'Make Admin'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'apis' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {apis.map(api => (
                      <Card 
                        key={api.id} 
                        title={api.name} 
                        subtitle={`Owner: ${api.owner_name}`}
                        footer={<span className="text-[10px] text-zinc-500">Base URL: {api.base_url}</span>}
                      >
                        <div className="flex justify-between items-center">
                          <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            {api.auth_type}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-bold">
                            Registered: {new Date(api.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === 'system' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="D1 Database">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Connected</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[85%]" />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Storage: 12.4 MB / 100 MB</p>
                      </div>
                    </Card>
                    <Card title="KV Storage">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Active</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[40%]" />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Keys: 1,240 Active</p>
                      </div>
                    </Card>
                    <Card title="R2 Storage">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">Ready</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[15%]" />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Buckets: 3 Total</p>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
