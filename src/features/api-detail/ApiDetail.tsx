import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useApi } from '../../hooks/useApi';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ApiConfig, Endpoint, Log } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingSpinner, EmptyState } from '../../components/Feedback';
import { ConfirmModal } from '../../components/Modal';
import { generateCurl, formatDate } from '../../utils/helpers';

export const ApiDetail: React.FC<{ api: ApiConfig, onBack: () => void }> = ({ api: initialApi, onBack }) => {
  const { showToast } = useApp();
  const [api, setApi] = useState<ApiConfig>(initialApi);
  const [endpoints, setEndpoints] = useLocalStorage<Endpoint[]>('smart_api_hub_endpoints', []);
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [activeTabs, setActiveTabs] = useState<Record<number, 'params' | 'payload' | 'curl' | 'logs'>>({});
  const [endpointLogs, setEndpointLogs] = useState<Record<number, Log[]>>({});
  const [endpointParams, setEndpointParams] = useLocalStorage<Record<number, { key: string, value: string }[]>>('smart_api_hub_endpoint_params', {});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  
  const { call, loading } = useApi();

  const fetchEndpoints = async () => {
    const data = await call(`/api/endpoints/${api.id}`);
    if (data) setEndpoints(data);
  };

  const fetchApiDetails = async () => {
    const data = await call(`/api/apis/${api.id}`);
    if (data) setApi(data);
  };

  useEffect(() => {
    fetchEndpoints();
    fetchApiDetails();
  }, [initialApi.id]);

  const handleAddEndpoint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      apiId: api.id,
      name: formData.get('name'),
      path: formData.get('path'),
      method: formData.get('method'),
      groupName: formData.get('groupName'),
      isFavorite: formData.get('isFavorite') === 'on',
    };

    const result = await call('/api/endpoints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result) {
      showToast('Endpoint added!', 'success');
      fetchEndpoints();
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshingToken(true);
    const result = await call(`/api/apis/${api.id}/refresh-token`, { method: 'POST' });
    if (result) {
      showToast('Token refreshed!', 'success');
      await fetchApiDetails();
    }
    setIsRefreshingToken(false);
  };

  const fetchLogs = async (endpointId: number) => {
    const data = await call(`/api/endpoints/${endpointId}/logs`);
    if (data) {
      setEndpointLogs(prev => ({ ...prev, [endpointId]: data }));
    }
  };

  const filteredEndpoints = endpoints.filter(ep => 
    ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ep.group_name && ep.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedEndpoints = filteredEndpoints.reduce((acc, ep) => {
    const group = ep.group_name || 'Default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ep);
    return acc;
  }, {} as Record<string, Endpoint[]>);

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await call(`/api/endpoints/${deleteId}`, { method: 'DELETE' });
    if (result) {
      showToast('Endpoint deleted', 'success');
      fetchEndpoints();
    }
  };

  const handleTest = async (ep: Endpoint) => {
    const params = endpointParams[ep.id] || [];
    const body = params.length > 0 ? params.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) : undefined;
    
    const result = await call('/api/proxy', {
      method: 'POST',
      body: JSON.stringify({ 
        apiId: api.id, 
        endpointId: ep.id,
        body: body
      }),
    });

    if (result) {
      setTestResults(prev => ({ ...prev, [ep.id]: { ...result, timestamp: new Date() } }));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <button onClick={onBack} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
          ← Back to Dashboard
        </button>

        <header className="flex justify-between items-end bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter">{api.name}</h1>
            <p className="text-zinc-500 font-mono text-sm bg-black/20 px-3 py-1 rounded-lg inline-block">{api.base_url}</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-600">Authentication</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold uppercase">
                {api.auth_type}
              </span>
            </div>
            {api.auth_endpoint && (
              <div className="flex flex-col items-end gap-2">
                {!api.token && api.auth_type === 'oauth2' && (
                  <span className="text-[10px] text-red-400 font-bold animate-pulse">
                    ⚠️ NO TOKEN FOUND - PLEASE REFRESH
                  </span>
                )}
                <div className="flex gap-4 text-[10px] font-mono text-zinc-500">
                  {api.last_refresh && (
                    <span>Last Refresh: {formatDate(api.last_refresh)}</span>
                  )}
                  {api.token_expires_at && (
                    <span className={new Date(api.token_expires_at) < new Date() ? 'text-red-400' : 'text-emerald-500'}>
                      Expires: {formatDate(api.token_expires_at)}
                    </span>
                  )}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleRefreshToken} 
                  isLoading={isRefreshingToken}
                  icon={<span>🔑</span>}
                >
                  Refresh Token
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <Card title="Add Endpoint">
              <form onSubmit={handleAddEndpoint} className="space-y-4">
                <Input label="Name" name="name" placeholder="e.g. Get Users" required />
                <Input label="Group" name="groupName" placeholder="e.g. Auth, Users" />
                <Input label="Path" name="path" placeholder="/v1/users" required />
                <Input label="Method" name="method" as="select">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </Input>
                <label className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all">
                  <input name="isFavorite" type="checkbox" className="w-4 h-4 accent-emerald-500 rounded border-zinc-700 bg-zinc-800" />
                  <span className="text-sm text-zinc-400 font-medium">Mark as Favorite</span>
                </label>
                <Button type="submit" className="w-full" isLoading={loading}>Create Endpoint</Button>
              </form>
            </Card>
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">Endpoints</h2>
                <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                  {filteredEndpoints.length} Total
                </span>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input 
                  placeholder="Search endpoints..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 text-xs w-full md:w-64"
                />
                <Button variant="secondary" onClick={fetchEndpoints} size="sm">Sync</Button>
              </div>
            </div>

            {loading && endpoints.length === 0 ? (
              <LoadingSpinner label="Loading endpoints..." />
            ) : filteredEndpoints.length > 0 ? (
              <div className="space-y-12">
                {(Object.entries(groupedEndpoints) as [string, Endpoint[]][]).map(([group, groupEps]) => (
                  <div key={group} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-600">{group}</h3>
                      <div className="h-px flex-1 bg-zinc-900" />
                    </div>
                    <div className="space-y-6">
                      {groupEps.map(ep => (
                        <div key={ep.id} className="space-y-3">
                          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center group hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-5">
                              <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg w-20 text-center tracking-widest ${
                                ep.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                ep.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>{ep.method}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-lg">{ep.name}</h4>
                                  {ep.is_favorite === 1 && <span className="text-yellow-500">★</span>}
                                </div>
                                <p className="text-xs text-zinc-500 font-mono mt-0.5">{ep.path}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setActiveTabs(prev => ({ ...prev, [ep.id]: prev[ep.id] ? undefined : 'params' } as any))}
                                className="text-zinc-500 hover:text-white text-xs font-bold transition-colors"
                              >
                                DETAILS
                              </button>
                              <button 
                                onClick={() => setDeleteId(ep.id)}
                                className="text-zinc-600 hover:text-red-400 text-xs font-bold transition-colors"
                              >
                                DELETE
                              </button>
                              <Button 
                                onClick={() => handleTest(ep)}
                                isLoading={loading}
                                size="sm"
                              >
                                TEST
                              </Button>
                            </div>
                          </div>

                          {activeTabs[ep.id] && (
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                              <div className="flex gap-6 border-b border-zinc-800">
                                {['params', 'payload', 'curl', 'logs'].map((tab) => (
                                  <button 
                                    key={tab}
                                    onClick={() => {
                                      setActiveTabs(prev => ({ ...prev, [ep.id]: tab as any }));
                                      if (tab === 'logs') fetchLogs(ep.id);
                                    }}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all ${activeTabs[ep.id] === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                                  >
                                    {tab}
                                  </button>
                                ))}
                              </div>
                              
                              {activeTabs[ep.id] === 'params' && (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                                      {ep.method === 'GET' ? 'Query Parameters' : 'Body Parameters'}
                                    </p>
                                    <button 
                                      onClick={() => setEndpointParams(prev => ({
                                        ...prev,
                                        [ep.id]: [...(prev[ep.id] || []), { key: '', value: '' }]
                                      }))}
                                      className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold"
                                    >
                                      + ADD PARAM
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {(endpointParams[ep.id] || []).map((param, idx) => (
                                      <div key={idx} className="flex gap-2">
                                        <input 
                                          placeholder="Key"
                                          value={param.key}
                                          onChange={(e) => {
                                            const newParams = [...(endpointParams[ep.id] || [])];
                                            newParams[idx] = { ...newParams[idx], key: e.target.value };
                                            setEndpointParams(prev => ({ ...prev, [ep.id]: newParams }));
                                          }}
                                          className="flex-1 bg-black/20 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/30"
                                        />
                                        <input 
                                          placeholder="Value"
                                          value={param.value}
                                          onChange={(e) => {
                                            const newParams = [...(endpointParams[ep.id] || [])];
                                            newParams[idx] = { ...newParams[idx], value: e.target.value };
                                            setEndpointParams(prev => ({ ...prev, [ep.id]: newParams }));
                                          }}
                                          className="flex-1 bg-black/20 border border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-500/30"
                                        />
                                        <button 
                                          onClick={() => {
                                            const newParams = (endpointParams[ep.id] || []).filter((_, i) => i !== idx);
                                            setEndpointParams(prev => ({ ...prev, [ep.id]: newParams }));
                                          }}
                                          className="text-zinc-700 hover:text-red-500 px-2"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                    {(endpointParams[ep.id] || []).length === 0 && (
                                      <p className="text-[10px] text-zinc-700 italic font-medium">No parameters defined for this request.</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeTabs[ep.id] === 'payload' && (
                                <div className="space-y-3">
                                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Preview Body</p>
                                  <pre className="text-xs font-mono text-zinc-400 bg-black/40 p-4 rounded-xl border border-zinc-800/50">
                                    {ep.method === 'GET' ? '// No body for GET requests' : 
                                      JSON.stringify((endpointParams[ep.id] || []).reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}), null, 2)
                                    }
                                  </pre>
                                </div>
                              )}

                              {activeTabs[ep.id] === 'curl' && (
                                <div className="space-y-3">
                                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">cURL Command</p>
                                  <pre className="text-xs font-mono text-zinc-400 bg-black/40 p-4 rounded-xl border border-zinc-800/50 overflow-x-auto">
                                    {generateCurl(api, ep, endpointParams[ep.id])}
                                  </pre>
                                </div>
                              )}

                              {activeTabs[ep.id] === 'logs' && (
                                <div className="space-y-4">
                                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Recent Activity</p>
                                  <div className="space-y-2">
                                    {(endpointLogs[ep.id] || []).map(log => (
                                      <div key={log.id} className="space-y-2">
                                        <div className="p-3 bg-black/20 rounded-xl border border-zinc-800/50 flex justify-between items-center">
                                          <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.status >= 400 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                              {log.status}
                                            </span>
                                            <span className="text-[10px] text-zinc-600 font-mono">{formatDate(log.timestamp)}</span>
                                          </div>
                                          <button 
                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                            className="text-[10px] text-zinc-500 hover:text-white font-bold"
                                          >
                                            {expandedLogId === log.id ? 'HIDE' : 'VIEW'}
                                          </button>
                                        </div>
                                        {expandedLogId === log.id && (
                                          <pre className="text-[10px] font-mono text-zinc-400 bg-black/60 p-4 rounded-xl border border-zinc-800/50 overflow-x-auto max-h-40">
                                            {JSON.stringify(JSON.parse(log.response_body), null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    ))}
                                    {(endpointLogs[ep.id] || []).length === 0 && (
                                      <p className="text-[10px] text-zinc-700 italic font-medium">No logs found for this endpoint.</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {testResults[ep.id] && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Response</span>
                                  <span className="text-[10px] text-zinc-600 font-mono">{formatDate(testResults[ep.id].timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${testResults[ep.id].status >= 400 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                    {testResults[ep.id].status} {testResults[ep.id].statusText}
                                  </span>
                                  <button onClick={() => setTestResults(prev => {
                                    const next = { ...prev };
                                    delete next[ep.id];
                                    return next;
                                  })} className="text-zinc-600 hover:text-zinc-400 text-xs">Clear</button>
                                </div>
                              </div>
                              <pre className="text-xs font-mono text-zinc-300 bg-black/50 p-5 rounded-2xl border border-zinc-800 overflow-x-auto max-h-[400px]">
                                {JSON.stringify(testResults[ep.id].data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="No endpoints" 
                description="Add your first endpoint to start testing this API."
              />
            )}
          </main>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Endpoint"
        message="This action cannot be undone. All saved parameters for this endpoint will be lost."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
