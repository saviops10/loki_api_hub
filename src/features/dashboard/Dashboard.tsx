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
import { ProfileMenu } from '../../components/ProfileMenu';
import { LokiIcon } from '../../components/Branding';
import { Terminal, Shield, Zap } from 'lucide-react';

const ApiKeyManager: React.FC<{ user: any, onRegenerateKey: () => void }> = ({ user, onRegenerateKey }) => {
  const { call, loading } = useApi();
  const { showToast } = useApp();
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showPrimary, setShowPrimary] = useState(false);

  const fetchKeys = async () => {
    const data = await call('/api/auth/keys');
    if (data) setKeys(data);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await call('/api/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ name: newKeyName })
    });
    if (result) {
      showToast('New API Key created!', 'success');
      setNewKeyName('');
      fetchKeys();
    }
  };

  const handleDeleteKey = async (id: number) => {
    const result = await call(`/api/auth/keys/${id}`, { method: 'DELETE' });
    if (result) {
      showToast('API Key deleted', 'success');
      fetchKeys();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">API Key Management</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-loki-primary animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">
                {keys.length + 1} Total Keys
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card title="Primary API Key" subtitle="Your main account key used for CLI and API access">
              <div className="space-y-6">
                <div className="bg-black/40 p-6 rounded-2xl border border-loki-primary/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Key Value</span>
                    <button 
                      onClick={() => setShowPrimary(!showPrimary)}
                      className="text-[10px] text-loki-primary hover:text-loki-accent font-bold uppercase tracking-widest"
                    >
                      {showPrimary ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-loki-primary flex-1 truncate bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
                      {showPrimary ? user.api_key : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(user.api_key);
                        showToast('Primary key copied to clipboard', 'success');
                      }}
                      className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-colors border border-zinc-800"
                    >
                      📋
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" onClick={onRegenerateKey} isLoading={loading} className="w-full">
                    🔄 Regenerate Primary Key
                  </Button>
                  <p className="text-[10px] text-zinc-500 italic text-center">
                    Warning: Regenerating will invalidate your current CLI sessions.
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Create New Key" subtitle="Generate additional keys for specific environments">
              <form onSubmit={handleCreateKey} className="space-y-4">
                <Input 
                  label="Key Name" 
                  placeholder="e.g. Production, CLI, Mobile" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required 
                />
                <Button type="submit" className="w-full" isLoading={loading}>Generate Additional Key</Button>
                <p className="text-[10px] text-zinc-500 italic text-center">
                  Plan limits apply. Free: 1 key, Business: 3 keys.
                </p>
              </form>
            </Card>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Additional API Keys</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {keys.map(k => (
                <div key={k.id} className="bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center group hover:border-loki-primary/30 transition-all">
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">{k.name}</h4>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-loki-accent bg-black/50 px-2 py-1 rounded border border-zinc-800">
                        {k.key.substring(0, 8)}••••••••••••••••
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(k.key);
                          showToast('Key copied to clipboard', 'success');
                        }}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                      Created: {new Date(k.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteKey(k.id)}
                    className="p-3 rounded-xl hover:bg-red-500/10 text-[10px] uppercase tracking-widest font-black text-zinc-600 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {keys.length === 0 && (
                <div className="col-span-full text-center py-12 bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2rem]">
                  <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.2em]">No additional keys found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<{ onSelectApi: (api: ApiConfig) => void, onOpenAdmin: () => void }> = ({ onSelectApi, onOpenAdmin }) => {
  const { user, setUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'apis' | 'cli' | 'keys'>('apis');
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
      authPayloadTemplate: formData.get('authPayloadTemplate'),
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

  const filteredApis = apis.filter(api => 
    api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.base_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-loki-bg p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center bg-zinc-900/20 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl relative z-[100]">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-loki-primary/10 border-2 border-loki-primary/20 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <LokiIcon className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-loki-primary/20 to-transparent" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-3xl font-black text-white tracking-tighter">LOKI HUB</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-600">API Management Platform</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <button onClick={() => setActiveTab('apis')} className={`hover:text-loki-accent transition-colors ${activeTab === 'apis' ? 'text-loki-accent' : ''}`}>APIs & Endpoints</button>
            <button onClick={() => setActiveTab('cli')} className={`hover:text-loki-accent transition-colors ${activeTab === 'cli' ? 'text-loki-accent' : ''}`}>Loki CLI</button>
            <button onClick={() => setActiveTab('keys')} className={`hover:text-loki-accent transition-colors ${activeTab === 'keys' ? 'text-loki-accent' : ''}`}>API Key</button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={fetchApis} className="hidden sm:flex">
              <span className="text-lg">🔄</span>
            </Button>
            <ProfileMenu onOpenAdmin={onOpenAdmin} />
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
                  <option value="oauth2">OAuth2</option>
                  <option value="bearer">Bearer Token</option>
                </Input>
                
                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-loki-accent/20 space-y-4 shadow-lg shadow-loki-accent/5">
                  <p className="text-[10px] uppercase tracking-widest text-loki-accent font-black">Authentication Config</p>
                  <div className="space-y-4">
                    <Input label="Client ID / API Key" name="apiKey" placeholder="ID or Key" />
                    <Input label="Client Secret (Optional)" name="clientSecret" placeholder="Secret" />
                  </div>
                  <hr className="border-zinc-800" />
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Token Auto-Refresh (POST)</p>
                  <Input label="Token Endpoint (POST)" name="authEndpoint" defaultValue={editingApi?.auth_endpoint} placeholder="https://auth.example.com/token" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Username" name="authUsername" defaultValue={editingApi?.auth_username} placeholder="User" />
                    <Input label="Password" name="authPassword" defaultValue={editingApi?.auth_password} type="password" placeholder="Pass" />
                  </div>
                  <Input 
                    label="Auth Payload Template (JSON)" 
                    name="authPayloadTemplate" 
                    defaultValue={editingApi?.auth_payload_template} 
                    placeholder='{ "user": "{{username}}", "pass": "{{password}}" }' 
                  />
                  <p className="text-[9px] text-zinc-500 italic">Use {"{{username}}"} and {"{{password}}"} as placeholders.</p>
                </div>

                <div className="flex gap-2">
                  {editingApi && <Button variant="ghost" className="flex-1" onClick={() => setEditingApi(null)}>Cancel</Button>}
                  <Button type="submit" className="flex-1" isLoading={loading}>{editingApi ? 'Update API' : 'Register API'}</Button>
                </div>
              </form>
            </Card>

            {/* Cloudflare Stack Status moved to Admin Panel */}
          </aside>

          <main className="lg:col-span-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex p-1.5 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 w-fit">
            <button 
              onClick={() => setActiveTab('apis')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'apis' ? 'bg-loki-primary text-zinc-950 shadow-lg shadow-loki-primary/20' : 'text-zinc-500 hover:text-white'}`}
            >
              APIs
            </button>
            <button 
              onClick={() => setActiveTab('cli')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cli' ? 'bg-loki-primary text-zinc-950 shadow-lg shadow-loki-primary/20' : 'text-zinc-500 hover:text-white'}`}
            >
              CLI
            </button>
          </div>
        </div>

        {activeTab === 'apis' ? (
          <>
            <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Your APIs</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-loki-primary animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">
                    {filteredApis.length} Active Connections
                  </span>
                </div>
              </div>
              <div className="w-full md:w-80">
                <Input 
                  placeholder="Search APIs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900/30 border-zinc-800/50"
                />
              </div>
            </div>

            {loading && apis.length === 0 ? (
              <LoadingSpinner label="Fetching your APIs..." />
            ) : filteredApis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredApis.map(api => (
                  <Card 
                    key={api.id} 
                    title={
                      <div className="flex justify-between items-center">
                        <span className="truncate">{api.name}</span>
                        {api.token && (
                          <div className="flex items-center gap-2 bg-loki-primary/10 px-2 py-1 rounded-lg border border-loki-primary/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-loki-primary shadow-[0_0_8px_rgba(0,184,148,0.5)]" />
                            <span className="text-[8px] font-black text-loki-primary uppercase tracking-widest">Active</span>
                          </div>
                        )}
                      </div>
                    } 
                    subtitle={api.base_url}
                    onClick={() => onSelectApi(api)}
                    footer={
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingApi(api); }}
                            className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black hover:text-loki-primary transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteApiId(api.id); }}
                            className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black hover:text-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        <span className="text-loki-primary text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">View Details →</span>
                      </div>
                    }
                  >
                    <div className="flex gap-2">
                      <span className="bg-zinc-800/50 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-800">
                        {api.auth_type}
                      </span>
                      {api.last_refresh && (
                        <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                          Last sync: {new Date(api.last_refresh).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No APIs yet" 
                description="Register your first API to start managing endpoints and testing requests."
              />
            )}
          </>
        ) : activeTab === 'cli' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter">L.O.K.I CLI</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                    Control your entire API ecosystem directly from your terminal. 
                    The Loki CLI is a powerful tool for developers who live in the command line.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-loki-primary">
                      <Terminal size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Installation</span>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 font-mono text-sm flex justify-between items-center group">
                      <code className="text-zinc-300">npm install -g @loki/cli</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('npm install -g @loki/cli');
                          showToast('Command copied!', 'success');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-loki-primary font-black uppercase tracking-widest"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-loki-primary">
                      <Shield size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Authentication</span>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 font-mono text-sm flex justify-between items-center group">
                      <code className="text-zinc-300">
                        loki login {user?.api_key ? `${user.api_key.substring(0, 8)}...${user.api_key.substring(user.api_key.length - 4)}` : 'YOUR_API_KEY'}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`loki login ${user?.api_key || 'YOUR_API_KEY'}`);
                          showToast('Command copied!', 'success');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-loki-primary font-black uppercase tracking-widest"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/20 border border-zinc-800 rounded-[3rem] p-10 space-y-8 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Common Commands</h4>
                  <Zap size={14} className="text-loki-accent" />
                </div>
                <div className="space-y-4">
                  {[
                    { cmd: 'loki list', desc: 'List all registered APIs' },
                    { cmd: 'loki call <api-id> <endpoint>', desc: 'Execute a proxy request' },
                    { cmd: 'loki logs --tail', desc: 'Stream real-time logs' },
                    { cmd: 'loki sync', desc: 'Sync local config with hub' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-zinc-800/50 group hover:border-loki-primary/30 transition-all">
                      <code className="text-loki-accent text-xs font-bold">{item.cmd}</code>
                      <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{item.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <Button variant="secondary" className="w-full text-[10px] font-black tracking-[0.2em] py-4">
                    VIEW FULL CLI DOCUMENTATION
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ApiKeyManager user={user} onRegenerateKey={handleRegenerateKey} />
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
