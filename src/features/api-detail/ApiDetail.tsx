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
import { ProfileMenu } from '../../components/ProfileMenu';
import { generateCurl, formatDate } from '../../utils/helpers';

export const ApiDetail: React.FC<{ api: ApiConfig, onBack: () => void }> = ({ api: initialApi, onBack }) => {
  const { showToast } = useApp();
  const [api, setApi] = useState<ApiConfig>(initialApi);
  const [endpoints, setEndpoints] = useLocalStorage<Endpoint[]>('smart_api_hub_endpoints', []);
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [activeEndpointTab, setActiveEndpointTab] = useState<'params' | 'payload' | 'curl' | 'logs'>('params');
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

  const handleDuplicateEndpoint = async (id: number) => {
    const result = await call(`/api/endpoints/${id}/duplicate`, { method: 'POST' });
    if (result) {
      showToast('Endpoint duplicated!', 'success');
      fetchEndpoints();
    }
  };

  const handleClearLogs = async (id: number) => {
    const result = await call(`/api/endpoints/${id}/logs`, { method: 'DELETE' });
    if (result) {
      showToast('Logs cleared!', 'success');
      setEndpointLogs(prev => ({ ...prev, [id]: [] }));
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
      setActiveEndpointTab('payload');
      fetchLogs(ep.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center bg-zinc-900/20 p-6 rounded-[2rem] border border-zinc-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <button onClick={onBack} className="w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl flex items-center justify-center transition-all group">
              <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
            </button>
            <div className="space-y-0.5">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{api.name}</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-600 truncate max-w-[200px] sm:max-w-none">{api.base_url}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {api.auth_endpoint && (
              <div className="hidden lg:flex items-center gap-4 bg-zinc-900/50 px-4 py-2 rounded-2xl border border-zinc-800/50">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-[0.2em] font-black text-zinc-600">Token Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${api.token ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                    <span className={`text-[10px] font-black uppercase ${api.token ? 'text-emerald-500' : 'text-red-500'}`}>
                      {api.token ? 'Active' : 'Missing'}
                    </span>
                  </div>
                </div>
                <div className="h-8 w-px bg-zinc-800" />
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-[0.2em] font-black text-zinc-600">Expires At</span>
                  <span className={`text-[10px] font-black ${api.token_expires_at && new Date(api.token_expires_at) < new Date() ? 'text-red-400' : 'text-zinc-400'}`}>
                    {api.token_expires_at ? formatDate(api.token_expires_at) : 'N/A'}
                  </span>
                </div>
                <button 
                  onClick={handleRefreshToken}
                  disabled={isRefreshingToken}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-emerald-500 transition-all disabled:opacity-50"
                  title="Refresh Token"
                >
                  {isRefreshingToken ? '⌛' : '🔄'}
                </button>
              </div>
            )}
            <div className="hidden lg:flex flex-col items-end gap-1 mr-4">
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600">Authentication</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase">
                {api.auth_type}
              </span>
            </div>
            <ProfileMenu />
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
                                onClick={() => handleDuplicateEndpoint(ep.id)}
                                className="text-zinc-600 hover:text-emerald-500 text-[10px] font-black transition-colors uppercase tracking-widest"
                                title="Duplicate"
                              >
                                📋
                              </button>
                              <Button 
                                onClick={() => {
                                  setSelectedEndpoint(ep);
                                  setActiveEndpointTab('params');
                                }}
                                variant="secondary"
                                size="sm"
                                className="border-gold-500/30 hover:border-gold-500/50"
                              >
                                OPEN
                              </Button>
                              <button 
                                onClick={() => setDeleteId(ep.id)}
                                className="text-zinc-600 hover:text-red-400 text-xs font-black transition-colors uppercase tracking-widest"
                              >
                                Delete
                              </button>
                            </div>
                          </div>


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

      {/* Endpoint Detail Modal */}
      {selectedEndpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedEndpoint(null)} />
          
          <div className="relative w-full max-w-4xl bg-zinc-950 border-2 border-gold-500/20 rounded-[2.5rem] shadow-2xl shadow-gold-500/5 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex flex-col h-[85vh] max-h-[800px]">
              {/* Modal Header */}
              <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        selectedEndpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        selectedEndpoint.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {selectedEndpoint.method}
                      </span>
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{selectedEndpoint.name}</h2>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-zinc-800/50 inline-block">
                      {api.base_url}{selectedEndpoint.path}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedEndpoint(null)}
                    className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-center transition-colors text-zinc-500 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="flex gap-8 mt-8 border-b border-zinc-800/50">
                  {['params', 'payload', 'curl', 'logs'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => {
                        setActiveEndpointTab(tab as any);
                        if (tab === 'logs') fetchLogs(selectedEndpoint.id);
                      }}
                      className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeEndpointTab === tab ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {tab}
                      {activeEndpointTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {activeEndpointTab === 'params' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Parameters</h3>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                          {selectedEndpoint.method === 'GET' ? 'Query String' : 'Request Body'}
                        </p>
                      </div>
                      <button 
                        onClick={() => setEndpointParams(prev => ({
                          ...prev,
                          [selectedEndpoint.id]: [...(prev[selectedEndpoint.id] || []), { key: '', value: '' }]
                        }))}
                        className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        + Add Param
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(endpointParams[selectedEndpoint.id] || []).map((param, idx) => (
                        <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                          <input 
                            placeholder="Key"
                            value={param.key}
                            onChange={(e) => {
                              const newParams = [...(endpointParams[selectedEndpoint.id] || [])];
                              newParams[idx] = { ...newParams[idx], key: e.target.value };
                              setEndpointParams(prev => ({ ...prev, [selectedEndpoint.id]: newParams }));
                            }}
                            className="flex-1 bg-zinc-900/50 border-2 border-zinc-800/50 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                          />
                          <input 
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => {
                              const newParams = [...(endpointParams[selectedEndpoint.id] || [])];
                              newParams[idx] = { ...newParams[idx], value: e.target.value };
                              setEndpointParams(prev => ({ ...prev, [selectedEndpoint.id]: newParams }));
                            }}
                            className="flex-1 bg-zinc-900/50 border-2 border-zinc-800/50 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                          />
                          <button 
                            onClick={() => {
                              const newParams = (endpointParams[selectedEndpoint.id] || []).filter((_, i) => i !== idx);
                              setEndpointParams(prev => ({ ...prev, [selectedEndpoint.id]: newParams }));
                            }}
                            className="w-12 h-12 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 transition-all"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {(endpointParams[selectedEndpoint.id] || []).length === 0 && (
                        <div className="text-center py-12 bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2rem]">
                          <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.2em]">No parameters defined</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeEndpointTab === 'payload' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Response Payload</h3>
                    {testResults[selectedEndpoint.id] ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                            testResults[selectedEndpoint.id].status >= 200 && testResults[selectedEndpoint.id].status < 300
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            STATUS: {testResults[selectedEndpoint.id].status}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            {formatDate(testResults[selectedEndpoint.id].timestamp)}
                          </span>
                        </div>
                        <pre className="bg-black/40 p-6 rounded-[2rem] border-2 border-zinc-800/50 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                          {JSON.stringify(testResults[selectedEndpoint.id].data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2rem]">
                        <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.2em]">No test results yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeEndpointTab === 'curl' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">cURL Command</h3>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generateCurl(api, selectedEndpoint, endpointParams[selectedEndpoint.id] || []));
                          showToast('cURL copied to clipboard!', 'success');
                        }}
                        className="text-[10px] text-emerald-500 hover:text-emerald-400 font-black uppercase tracking-widest"
                      >
                        Copy Command
                      </button>
                    </div>
                    <pre className="bg-black/40 p-6 rounded-[2rem] border-2 border-zinc-800/50 text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {generateCurl(api, selectedEndpoint, endpointParams[selectedEndpoint.id] || [])}
                    </pre>
                  </div>
                )}

                {activeEndpointTab === 'logs' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Recent Activity</h3>
                      <button 
                        onClick={() => handleClearLogs(selectedEndpoint.id)}
                        className="text-[10px] text-red-500 hover:text-red-400 font-black uppercase tracking-widest"
                      >
                        Clear History
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(endpointLogs[selectedEndpoint.id] || []).map((log: any) => (
                        <div key={log.id} className="p-5 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex justify-between items-center hover:bg-zinc-900/50 transition-all">
                          <div className="flex items-center gap-4">
                            <span className={`w-2 h-2 rounded-full ${log.status >= 200 && log.status < 300 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-widest">Status {log.status}</p>
                              <p className="text-[10px] text-zinc-600 font-bold">{formatDate(log.timestamp)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setTestResults(prev => ({ ...prev, [selectedEndpoint.id]: { status: log.status, data: JSON.parse(log.response_body), timestamp: new Date(log.timestamp) } }))}
                            className="text-[10px] text-emerald-500 hover:text-emerald-400 font-black uppercase tracking-widest"
                          >
                            View
                          </button>
                        </div>
                      ))}
                      {(endpointLogs[selectedEndpoint.id] || []).length === 0 && (
                        <div className="text-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-[2rem]">
                          <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.2em]">No logs available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-zinc-800/50 bg-zinc-900/20 flex justify-end gap-4">
                <Button 
                  variant="secondary" 
                  onClick={() => setSelectedEndpoint(null)}
                  className="px-8"
                >
                  CLOSE
                </Button>
                <Button 
                  onClick={() => handleTest(selectedEndpoint)}
                  isLoading={loading}
                  className="px-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                >
                  EXECUTE REQUEST
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
