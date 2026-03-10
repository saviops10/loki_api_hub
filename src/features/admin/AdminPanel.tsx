import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/Feedback';
import { ProfileMenu } from '../../components/ProfileMenu';

type AdminTab = 'users' | 'apis' | 'plans' | 'system';

export const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, showToast } = useApp();
  const { call, loading } = useApi();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const fetchData = async () => {
    if (activeTab === 'users') {
      const data = await call('/api/admin/users');
      if (data) setUsers(data);
    } else if (activeTab === 'apis') {
      const data = await call('/api/admin/apis');
      if (data) setApis(data);
    } else if (activeTab === 'plans') {
      const data = await call('/api/admin/plans');
      if (data) setPlans(data);
    } else if (activeTab === 'system') {
      const data = await call('/api/admin/system-status');
      if (data) setSystemStatus(data);
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
    <div className="min-h-screen bg-loki-bg flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900/50 border-b border-white/10 p-4 sm:px-8 flex justify-between items-center backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-all"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-2">
              <span className="text-loki-primary">LOKI</span> ADMIN
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
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'users' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>👥</span> Users
          </button>
          <button 
            onClick={() => setActiveTab('apis')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'apis' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>🔌</span> APIs
          </button>
          <button 
            onClick={() => setActiveTab('plans')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'plans' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            <span>💎</span> Plans
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${activeTab === 'system' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'}`}
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
                  {activeTab === 'users' ? 'User Management' : activeTab === 'apis' ? 'API Inventory' : activeTab === 'plans' ? 'Plan Management' : 'Cloudflare Stack'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {activeTab === 'users' ? 'Manage system users and their permissions.' : activeTab === 'apis' ? 'Overview of all registered APIs across the platform.' : activeTab === 'plans' ? 'Manage subscription plans and their limits.' : 'Real-time status of Cloudflare infrastructure.'}
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
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Plan</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Usage</th>
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
                              <span className="text-zinc-300 text-xs font-bold">{u.plan_name || 'Free'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-zinc-400 text-xs">{u.request_count || 0} calls</span>
                            </td>
                            <td className="px-6 py-4">
                              {u.is_admin === 1 ? (
                                <span className="bg-loki-primary/10 text-loki-primary text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-loki-primary/20">Admin</span>
                              ) : (
                                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-zinc-700">User</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => toggleAdmin(u.id, u.is_admin)}
                                className="text-[10px] font-black uppercase tracking-widest text-loki-primary hover:text-loki-accent transition-colors"
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

                {activeTab === 'plans' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                      <Card 
                        key={plan.id} 
                        title={plan.name} 
                        subtitle={plan.price}
                        footer={<span className="text-[10px] text-zinc-500">Limit: {plan.request_limit.toLocaleString()} / month</span>}
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Max APIs</span>
                            <span className="text-white">{plan.max_apis}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Max Endpoints</span>
                            <span className="text-white">{plan.max_endpoints}</span>
                          </div>
                          <div className="pt-2 border-t border-zinc-800">
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Features</p>
                            <ul className="space-y-1">
                              {JSON.parse(plan.features).map((f: string, i: number) => (
                                <li key={i} className="text-[10px] text-zinc-400 flex items-center gap-2">
                                  <span className="text-loki-primary">✔</span> {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === 'system' && systemStatus && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="D1 Database">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-loki-primary text-xs font-black uppercase tracking-widest">{systemStatus.d1.status}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-loki-primary transition-all duration-1000" style={{ width: `${systemStatus.d1.percentage}%` }} />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Storage: {systemStatus.d1.usage}</p>
                      </div>
                    </Card>
                    <Card title="KV Storage">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-loki-primary text-xs font-black uppercase tracking-widest">{systemStatus.kv.status}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-loki-primary transition-all duration-1000" style={{ width: `${systemStatus.kv.percentage}%` }} />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Keys: {systemStatus.kv.keys}</p>
                      </div>
                    </Card>
                    <Card title="R2 Storage">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-sm">Status</span>
                          <span className="text-loki-primary text-xs font-black uppercase tracking-widest">{systemStatus.r2.status}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-loki-primary transition-all duration-1000" style={{ width: `${systemStatus.r2.percentage}%` }} />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Buckets: {systemStatus.r2.buckets}</p>
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
