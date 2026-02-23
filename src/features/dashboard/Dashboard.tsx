import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ApiConfig } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingSpinner, EmptyState } from '../../components/Feedback';
import { ConfirmModal } from '../../components/Modal';

export const Dashboard: React.FC<{ onSelectApi: (api: ApiConfig) => void }> = ({ onSelectApi }) => {
  const { user, setUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'apis' | 'cli'>('apis');
  const [apis, setApis] = useLocalStorage<ApiConfig[]>('smart_api_hub_apis', []);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [deleteApiId, setDeleteApiId] = useState<number | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { call, loading } = useApi();

  const fetchApis = async () => {
    if (!user) return;
    const data = await call('/api/apis');
    if (data) setApis(data);
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleAddApi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      userId: user?.id,
      name: formData.get('name'),
      baseUrl: formData.get('baseUrl'),
      authType: formData.get('authType'),
      authEndpoint: formData.get('authEndpoint'),
      authUsername: formData.get('authUsername'),
      authPassword: formData.get('authPassword'),
      authConfig: {
        apiKey: formData.get('apiKey'),
        clientId: formData.get('clientId'),
        clientSecret: formData.get('clientSecret'),
      }
    };

    const url = editingApi ? `/api/apis/${editingApi.id}` : '/api/apis';
    const method = editingApi ? 'PUT' : 'POST';

    const result = await call(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (result) {
      showToast(editingApi ? 'API updated!' : 'API registered!', 'success');
      fetchApis();
      setEditingApi(null);
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleDeleteApi = async () => {
    if (!deleteApiId) return;
    const result = await call(`/api/apis/${deleteApiId}`, { method: 'DELETE' });
    if (result) {
      showToast('API deleted', 'success');
      fetchApis();
    }
  };

  const handleRegenerateKey = async () => {
    const result = await call('/api/auth/regenerate-key', { method: 'POST' });
    if (result && result.api_key) {
      setUser({ ...user!, api_key: result.api_key });
      showToast('API Key regenerated!', 'success');
    }
  };

  const handleDeleteAccount = async () => {
    const result = await call('/api/auth/account', { method: 'DELETE' });
    if (result) {
      showToast('Account deleted. Goodbye!', 'success');
      setUser(null);
    }
  };

  const [showApiKey, setShowApiKey] = useState(false);

  const handleLogout = async () => {
    await call('/api/auth/logout', { method: 'POST' });
    setUser(null);
    showToast('Logged out successfully', 'success');
  };

  const filteredApis = apis.filter(api => 
    api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.base_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center relative overflow-hidden">
              <span className="text-2xl relative z-10">🐍</span>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-white tracking-tight">DASHBOARD</h1>
              <div className="flex items-center gap-4">
                <p className="text-zinc-500 font-medium">Welcome back, <span className="text-emerald-400">{user?.username}</span></p>
                {user?.api_key && (
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">API KEY:</span>
                    <code className="text-[10px] text-emerald-500 font-mono">
                      {showApiKey ? user.api_key : `${user.api_key.slice(0, 8)}****`}
                    </code>
                    <div className="flex items-center gap-1 ml-1">
                      <button 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[10px] text-zinc-600 hover:text-white transition-colors"
                        title={showApiKey ? "Hide Key" : "Show Key"}
                      >
                        {showApiKey ? '👁️' : '👁️‍🗨️'}
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(user.api_key!);
                          showToast('API Key copied!', 'success');
                        }}
                        className="text-[10px] text-zinc-600 hover:text-white transition-colors"
                        title="Copy Key"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchApis} icon={<span>🔄</span>}>Refresh</Button>
            <Button variant="ghost" onClick={handleLogout}>Logout</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <Card title={editingApi ? "Edit API" : "Register New API"}>
              <form onSubmit={handleAddApi} className="space-y-4">
                <Input label="API Name" name="name" defaultValue={editingApi?.name} placeholder="e.g. Stripe API" required />
                <Input label="Base URL" name="baseUrl" defaultValue={editingApi?.base_url} placeholder="https://api.example.com" required />
                <Input label="Auth Type" name="authType" defaultValue={editingApi?.auth_type} as="select">
                  <option value="none">No Auth</option>
                  <option value="apikey">API Key</option>
                  <option value="oauth2">OAuth2 / Token</option>
                </Input>
                
                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Authentication Config</p>
                  <Input label="API Key" name="apiKey" placeholder="For API Key auth" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Client ID" name="clientId" placeholder="OAuth2" />
                    <Input label="Client Secret" name="clientSecret" placeholder="OAuth2" />
                  </div>
                  <hr className="border-zinc-800" />
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Token Auto-Refresh (POST)</p>
                  <Input label="Auth Endpoint" name="authEndpoint" defaultValue={editingApi?.auth_endpoint} placeholder="https://auth.example.com/login" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Username" name="authUsername" defaultValue={editingApi?.auth_username} placeholder="User" />
                    <Input label="Password" name="authPassword" defaultValue={editingApi?.auth_password} type="password" placeholder="Pass" />
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingApi && <Button variant="ghost" className="flex-1" onClick={() => setEditingApi(null)}>Cancel</Button>}
                  <Button type="submit" className="flex-1" isLoading={loading}>{editingApi ? 'Update' : 'Add'} API</Button>
                </div>
              </form>
            </Card>

            <Card title="Cloudflare Stack Status">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🗄️</span>
                    <div>
                      <p className="text-xs font-bold text-white">D1 Database</p>
                      <p className="text-[10px] text-zinc-500">Relational Data</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-white">KV Storage</p>
                      <p className="text-[10px] text-zinc-500">Fast Sessions</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <p className="text-xs font-bold text-white">R2 Storage</p>
                      <p className="text-[10px] text-zinc-500">Large Payloads</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Ready</span>
                </div>
              </div>
            </Card>
            <Card title="Security & Account">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">API Key Management</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full text-[10px]"
                    onClick={handleRegenerateKey}
                  >
                    Regenerate API Key
                  </Button>
                </div>
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-red-500/50">Danger Zone</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-[10px] text-red-500 hover:bg-red-500/10"
                    onClick={() => setShowDeleteAccountModal(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <div className="flex gap-4 border-b border-zinc-800 pb-px">
              <button 
                onClick={() => setActiveTab('apis')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'apis' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                APIs & Endpoints
                {activeTab === 'apis' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
              <button 
                onClick={() => setActiveTab('cli')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors relative ${activeTab === 'cli' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Loki CLI
                {activeTab === 'cli' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </button>
            </div>

            {activeTab === 'apis' ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">Your APIs</h2>
                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {filteredApis.length} Active
                </span>
              </div>
              <div className="w-full md:w-64">
                <Input 
                  placeholder="Search APIs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800"
                />
              </div>
            </div>

            {loading && apis.length === 0 ? (
              <LoadingSpinner label="Fetching your APIs..." />
            ) : filteredApis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredApis.map(api => (
                  <Card 
                    key={api.id} 
                    title={
                      <div className="flex justify-between items-center">
                        <span>{api.name}</span>
                        {api.token && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Token Active" />
                        )}
                      </div>
                    } 
                    subtitle={api.base_url}
                    onClick={() => onSelectApi(api)}
                    footer={
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingApi(api); }}
                            className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold hover:text-white"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteApiId(api.id); }}
                            className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                        <span className="text-emerald-500 text-xs font-medium">View Details →</span>
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No APIs yet" 
                description="Register your first API to start managing endpoints and testing requests."
              />
            )}
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Loki CLI</h2>
              <p className="text-zinc-400 max-w-2xl">
                A professional command-line interface for advanced users. Manage your APIs, execute requests, and control tokens directly from your terminal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Installation">
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500">Install the Loki CLI globally using npm:</p>
                  <div className="bg-black p-4 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-500">
                    $ npm install -g loki-cli
                  </div>
                </div>
              </Card>

              <Card title="Quick Start">
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500">Authenticate your terminal session:</p>
                  <div className="bg-black p-4 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-500">
                    $ loki login --api-key {user?.api_key || 'YOUR_KEY'}
                  </div>
                </div>
              </Card>
            </div>

            <Card title="Common Commands">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Management</p>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki apis</code>
                      <span className="text-zinc-600">List all APIs</span>
                    </li>
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki endpoints --api-id 1</code>
                      <span className="text-zinc-600">List endpoints</span>
                    </li>
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki deploy --file api.json</code>
                      <span className="text-zinc-600">Deploy config</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Execution</p>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki call --api-id 1 --endpoint-id 2</code>
                      <span className="text-zinc-600">Execute request</span>
                    </li>
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki token status --api-id 1</code>
                      <span className="text-zinc-600">Check validity</span>
                    </li>
                    <li className="flex justify-between items-center text-[11px]">
                      <code className="text-emerald-400">loki token refresh --api-id 1</code>
                      <span className="text-zinc-600">Manual refresh</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl">
              <div className="flex gap-4 items-start">
                <span className="text-2xl">💡</span>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-400">Pro Tip</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Use the <code className="text-emerald-500">--json</code> flag with any command to get raw data output, perfect for piping into tools like <code className="text-zinc-300">jq</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteApiId}
        onClose={() => setDeleteApiId(null)}
        onConfirm={handleDeleteApi}
        title="Delete API"
        message="This will permanently delete this API and all its endpoints and logs. This action cannot be undone."
        confirmLabel="Delete API"
        variant="danger"
      />

      <ConfirmModal 
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="WARNING: This action is irreversible. All your APIs, endpoints, and logs will be permanently deleted. Your account will be closed."
        confirmLabel="Delete My Account"
        variant="danger"
      />
    </div>
  );
};
