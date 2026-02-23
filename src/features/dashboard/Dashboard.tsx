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
  const [apis, setApis] = useLocalStorage<ApiConfig[]>('smart_api_hub_apis', []);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [deleteApiId, setDeleteApiId] = useState<number | null>(null);
  const { call, loading } = useApi();

  const fetchApis = async () => {
    if (!user) return;
    const data = await call(`/api/apis?userId=${user.id}`);
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

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tight">DASHBOARD</h1>
            <p className="text-zinc-500 font-medium">Welcome back, <span className="text-emerald-400">{user?.username}</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchApis} icon={<span>🔄</span>}>Refresh</Button>
            <Button variant="ghost" onClick={() => setUser(null)}>Logout</Button>
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
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Your APIs</h2>
              <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                {apis.length} Active
              </span>
            </div>

            {loading && apis.length === 0 ? (
              <LoadingSpinner label="Fetching your APIs..." />
            ) : apis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apis.map(api => (
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
    </div>
  );
};
