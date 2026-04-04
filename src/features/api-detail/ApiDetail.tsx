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
import { generateCurl, generateSnippet, formatDate } from '../../utils/helpers';
import Papa from 'papaparse';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Code, BarChart3, Activity, Terminal, Shield, Zap, GitFork, Edit2, RefreshCw,
  Upload, Play, CheckCircle2, XCircle, AlertCircle, FileText, Layers
} from 'lucide-react';

export const ApiDetail: React.FC<{ api: ApiConfig, onBack: () => void }> = ({ api: initialApi, onBack }) => {
  const { showToast } = useApp();
  const [api, setApi] = useState<ApiConfig>(initialApi);
  const [endpoints, setEndpoints] = useLocalStorage<Endpoint[]>('smart_api_hub_endpoints', []);
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [activeEndpointTab, setActiveEndpointTab] = useState<'params' | 'payload' | 'code' | 'logs' | 'stats' | 'bulk'>('params');
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'js' | 'python' | 'go'>('curl');
  
  // Bulk Request State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [paramMapping, setParamMapping] = useState<Record<string, string>>({});
  const [bulkResults, setBulkResults] = useState<{ status: number, data: any, timestamp: Date, success: boolean }[]>([]);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [endpointLogs, setEndpointLogs] = useState<Record<number, Log[]>>({});
  const [endpointParams, setEndpointParams] = useLocalStorage<Record<number, { key: string, value: string }[]>>('smart_api_hub_endpoint_params', {});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'endpoints' | 'analytics'>('endpoints');
  const [stats, setStats] = useState<any>(null);
  
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  
  const { call, loading } = useApi();

  // Simulated analytics data
  const statsData = [
    { name: '00:00', latency: 120, success: 100 },
    { name: '04:00', latency: 145, success: 98 },
    { name: '08:00', latency: 210, success: 95 },
    { name: '12:00', latency: 180, success: 99 },
    { name: '16:00', latency: 250, success: 92 },
    { name: '20:00', latency: 150, success: 100 },
  ];

  const errorDistribution = [
    { name: '200 OK', value: 85, color: '#00F5C8' },
    { name: '401 Unauthorized', value: 8, color: '#F27D26' },
    { name: '404 Not Found', value: 5, color: '#6366f1' },
    { name: '500 Server Error', value: 2, color: '#ef4444' },
  ];

  const fetchEndpoints = async () => {
    const data = await call(`/api/endpoints/${api.id}`);
    if (data) setEndpoints(data);
  };

  const fetchApiDetails = async () => {
    const data = await call(`/api/apis/${api.id}`);
    if (data) setApi(data);
  };

  const fetchStats = async () => {
    const data = await call(`/api/apis/${api.id}/stats`);
    if (data) setStats(data);
  };

  useEffect(() => {
    fetchEndpoints();
    fetchApiDetails();
  }, [initialApi.id]);

  useEffect(() => {
    if (viewMode === 'analytics') {
      fetchStats();
    }
  }, [viewMode, api.id]);

  useEffect(() => {
    if (selectedEndpoint && activeEndpointTab === 'logs') {
      fetchLogs(selectedEndpoint.id);
    }
  }, [selectedEndpoint?.id, activeEndpointTab]);

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

    const url = editingEndpoint ? `/api/endpoints/${editingEndpoint.id}` : '/api/endpoints';
    const method = editingEndpoint ? 'PUT' : 'POST';

    const result = await call(url, {
      method,
      body: JSON.stringify(payload),
    });

    if (result) {
      showToast(editingEndpoint ? 'Endpoint updated!' : 'Endpoint added!', 'success');
      fetchEndpoints();
      setEditingEndpoint(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          // Auto-mapping
          const mapping: Record<string, string> = {};
          const params = endpointParams[selectedEndpoint.id] || [];
          params.forEach(p => {
            if (results.meta.fields?.includes(p.key)) {
              mapping[p.key] = p.key;
            }
          });
          setParamMapping(mapping);
        }
        showToast(`CSV loaded: ${results.data.length} rows found`, 'success');
      },
      error: (error) => {
        showToast(`Error parsing CSV: ${error.message}`, 'error');
      }
    });
  };

  const handleBulkRun = async () => {
    if (!selectedEndpoint || csvData.length === 0) return;
    
    setIsBulkRunning(true);
    setBulkResults([]);
    setBulkProgress(0);
    
    const results: any[] = [];
    const total = csvData.length;
    
    for (let i = 0; i < total; i++) {
      const row = csvData[i];
      const mappedBody: Record<string, any> = {};
      
      // Map CSV columns to parameters
      Object.entries(paramMapping).forEach(([paramKey, csvHeader]) => {
        if (csvHeader) {
          mappedBody[paramKey] = row[csvHeader];
        }
      });

      try {
        const result = await call('/api/proxy', {
          method: 'POST',
          body: JSON.stringify({ 
            apiId: api.id, 
            endpointId: selectedEndpoint.id,
            body: mappedBody
          }),
        });

        const success = result && result.status >= 200 && result.status < 300;
        results.push({ 
          status: result?.status || 500, 
          data: result, 
          timestamp: new Date(),
          success: !!success
        });
      } catch (err) {
        results.push({ 
          status: 500, 
          data: { error: 'Request failed' }, 
          timestamp: new Date(),
          success: false
        });
      }
      
      setBulkProgress(Math.round(((i + 1) / total) * 100));
      setBulkResults([...results]);
    }
    
    setIsBulkRunning(false);
    showToast('Bulk execution completed!', 'success');
    fetchLogs(selectedEndpoint.id);
  };

  return (
    <div className="min-h-screen bg-loki-bg p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center bg-zinc-900/20 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
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
                    <div className={`w-1.5 h-1.5 rounded-full ${api.token ? 'bg-loki-primary shadow-[0_0_8px_rgba(0,184,148,0.5)]' : 'bg-red-500 animate-pulse'}`} />
                    <span className={`text-[10px] font-black uppercase ${api.token ? 'text-loki-primary' : 'text-red-500'}`}>
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
                  className="p-2 hover:bg-zinc-800 rounded-xl text-loki-primary transition-all disabled:opacity-50"
                  title="Refresh Token"
                >
                  {isRefreshingToken ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
            <div className="hidden lg:flex flex-col items-end gap-1 mr-4">
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-600">Authentication</span>
              <span className="bg-loki-primary/10 text-loki-accent px-3 py-1 rounded-full border border-loki-primary/20 text-[10px] font-black uppercase">
                {api.auth_type === 'basic' ? 'Basic Auth' : api.auth_type}
              </span>
            </div>
            <ProfileMenu />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <Card title={editingEndpoint ? "Edit Endpoint" : "Add Endpoint"}>
              <form onSubmit={handleAddEndpoint} className="space-y-4">
                <Input label="Name" name="name" defaultValue={editingEndpoint?.name} placeholder="e.g. Get Users" required />
                <Input label="Group" name="groupName" defaultValue={editingEndpoint?.group_name} placeholder="e.g. Auth, Users" />
                <Input label="Path" name="path" defaultValue={editingEndpoint?.path} placeholder="/v1/users" required />
                <Input label="Method" name="method" defaultValue={editingEndpoint?.method} as="select">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </Input>
                <label className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all">
                  <input name="isFavorite" type="checkbox" defaultChecked={editingEndpoint?.is_favorite === 1} className="w-4 h-4 accent-loki-primary rounded border-zinc-700 bg-zinc-800" />
                  <span className="text-sm text-zinc-400 font-medium">Mark as Favorite</span>
                </label>
                <div className="flex gap-2">
                  {editingEndpoint && (
                    <Button variant="ghost" className="flex-1" onClick={() => setEditingEndpoint(null)}>Cancel</Button>
                  )}
                  <Button type="submit" className="flex-1" isLoading={loading}>
                    {editingEndpoint ? 'Update Endpoint' : 'Create Endpoint'}
                  </Button>
                </div>
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
                <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 mr-2">
                  <button 
                    onClick={() => setViewMode('endpoints')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'endpoints' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Endpoints
                  </button>
                  <button 
                    onClick={() => setViewMode('analytics')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-loki-primary text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                  >
                    Analytics
                  </button>
                </div>
                <Input 
                  placeholder="Search endpoints..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800 text-xs w-full md:w-64"
                />
                <Button variant="secondary" onClick={fetchEndpoints} size="sm">Sync</Button>
              </div>
            </div>

            {viewMode === 'analytics' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-zinc-900/40 border-zinc-800/50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Total Requests</p>
                      <h3 className="text-3xl font-black text-white tracking-tighter">{stats?.stats?.total || 0}</h3>
                    </div>
                  </Card>
                  <Card className="bg-zinc-900/40 border-zinc-800/50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Success Rate</p>
                      <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-loki-primary tracking-tighter">{stats?.stats?.successRate || 0}%</h3>
                        <div className="h-1.5 w-12 bg-zinc-800 rounded-full mb-2 overflow-hidden">
                          <div className="h-full bg-loki-primary" style={{ width: `${stats?.stats?.successRate || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="bg-zinc-900/40 border-zinc-800/50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Avg Latency</p>
                      <h3 className="text-3xl font-black text-loki-accent tracking-tighter">{stats?.stats?.avgLatency || 0}ms</h3>
                    </div>
                  </Card>
                  <Card className="bg-zinc-900/40 border-zinc-800/50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Max Latency</p>
                      <h3 className="text-3xl font-black text-zinc-400 tracking-tighter">{stats?.stats?.maxLatency || 0}ms</h3>
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card title="Latency Over Time (ms)">
                    <div className="h-64 w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats?.latencyData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                            itemStyle={{ color: '#00F5C8', fontSize: '12px' }}
                          />
                          <Line type="monotone" dataKey="latency" stroke="#00F5C8" strokeWidth={3} dot={{ fill: '#00F5C8', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Response Codes Distribution">
                    <div className="h-64 w-full mt-4 flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.errorDistribution || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(stats?.errorDistribution || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={
                                entry.name.includes('200') ? '#00F5C8' :
                                entry.name.includes('401') ? '#F27D26' :
                                entry.name.includes('404') ? '#6366f1' : '#ef4444'
                              } />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 pr-8">
                        {(stats?.errorDistribution || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 
                                item.name.includes('200') ? '#00F5C8' :
                                item.name.includes('401') ? '#F27D26' :
                                item.name.includes('404') ? '#6366f1' : '#ef4444'
                             }} />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.name}</span>
                            <span className="text-[10px] font-black text-white ml-auto">{Math.round((item.value / (stats?.stats?.total || 1)) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : loading && endpoints.length === 0 ? (
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
                                ep.method === 'POST' ? 'bg-loki-primary/10 text-loki-accent border border-loki-primary/20' :
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
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setEditingEndpoint(ep)}
                                className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-loki-primary transition-all group cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                              </button>
                              <button 
                                onClick={() => handleDuplicateEndpoint(ep.id)}
                                className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-loki-primary transition-all group cursor-pointer"
                                title="Duplicate (Fork)"
                              >
                                <GitFork size={16} className="group-hover:scale-110 transition-transform" />
                              </button>
                              <Button 
                                onClick={() => {
                                  setSelectedEndpoint(ep);
                                  setActiveEndpointTab('params');
                                }}
                                variant="secondary"
                                className="h-10 px-6 border-loki-accent/30 hover:border-loki-accent/50"
                              >
                                OPEN
                              </Button>
                              <button 
                                onClick={() => setDeleteId(ep.id)}
                                className="w-10 h-10 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-500 transition-all cursor-pointer"
                                title="Delete"
                              >
                                <span className="text-lg">×</span>
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
          
          <div className="relative w-full max-w-4xl bg-zinc-950 border-2 border-loki-accent/20 rounded-[2.5rem] shadow-2xl shadow-loki-accent/5 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex flex-col h-[85vh] max-h-[800px]">
              {/* Modal Header */}
              <div className="p-8 border-b border-zinc-800/50 bg-zinc-900/20">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        selectedEndpoint.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        selectedEndpoint.method === 'POST' ? 'bg-loki-primary/10 text-loki-accent border border-loki-primary/20' :
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
                  {['params', 'payload', 'code', 'logs', 'stats', 'bulk'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => {
                        setActiveEndpointTab(tab as any);
                        if (tab === 'logs') fetchLogs(selectedEndpoint.id);
                      }}
                      className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeEndpointTab === tab ? 'text-loki-accent' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      {tab}
                      {activeEndpointTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-loki-accent shadow-[0_0_8px_rgba(0,245,200,0.5)]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {activeEndpointTab === 'bulk' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">1. Upload CSV</h3>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Upload a file with your request data</p>
                        </div>
                        
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={isBulkRunning}
                          />
                          <div className="p-8 border-2 border-dashed border-zinc-800 group-hover:border-loki-primary/30 rounded-[2rem] bg-zinc-900/20 flex flex-col items-center justify-center gap-4 transition-all">
                            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                              <Upload className="w-6 h-6 text-zinc-500 group-hover:text-loki-primary transition-colors" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-black text-white uppercase tracking-widest">
                                {csvData.length > 0 ? `File Loaded: ${csvData.length} rows` : 'Drop CSV file here'}
                              </p>
                              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">or click to browse</p>
                            </div>
                          </div>
                        </div>

                        {csvHeaders.length > 0 && (
                          <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2">
                              <h3 className="text-sm font-black text-white uppercase tracking-widest">2. Map Parameters</h3>
                              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Map endpoint fields to CSV columns</p>
                            </div>
                            
                            <div className="space-y-3 bg-black/40 p-6 rounded-[2rem] border border-zinc-800/50">
                              {(endpointParams[selectedEndpoint.id] || []).map((param) => (
                                <div key={param.key} className="flex items-center gap-4">
                                  <div className="w-1/3">
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{param.key}</span>
                                  </div>
                                  <div className="flex-1">
                                    <select 
                                      value={paramMapping[param.key] || ''}
                                      onChange={(e) => setParamMapping(prev => ({ ...prev, [param.key]: e.target.value }))}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-loki-primary/30"
                                    >
                                      <option value="">-- Ignore --</option>
                                      {csvHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}
                              {(endpointParams[selectedEndpoint.id] || []).length === 0 && (
                                <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                  <AlertCircle className="w-4 h-4 text-zinc-500" />
                                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">No parameters defined for this endpoint</p>
                                </div>
                              )}
                            </div>

                            <Button 
                              onClick={handleBulkRun}
                              disabled={isBulkRunning || csvData.length === 0}
                              className="w-full h-14 bg-loki-primary hover:bg-loki-accent text-zinc-950 shadow-loki-primary/20"
                            >
                              {isBulkRunning ? (
                                <div className="flex items-center gap-3">
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>EXECUTING {bulkProgress}%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <Play className="w-4 h-4" />
                                  <span>RUN MASSIVE REQUESTS</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Execution Results</h3>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Real-time progress and status</p>
                        </div>

                        <div className="bg-black/40 rounded-[2rem] border border-zinc-800/50 flex flex-col h-[400px]">
                          {bulkResults.length > 0 ? (
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                              {bulkResults.map((res, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 animate-in slide-in-from-bottom-2 duration-200">
                                  <div className="flex items-center gap-3">
                                    {res.success ? (
                                      <CheckCircle2 className="w-4 h-4 text-loki-primary" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Request #{i + 1}</span>
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${res.success ? 'bg-loki-primary/10 text-loki-primary' : 'bg-red-500/10 text-red-400'}`}>
                                    {res.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                              <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                                <Layers className="w-8 h-8 text-zinc-800" />
                              </div>
                              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">Waiting for execution...</p>
                            </div>
                          )}
                          
                          {isBulkRunning && (
                            <div className="p-6 border-t border-zinc-800/50 bg-zinc-900/20">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Overall Progress</span>
                                <span className="text-[10px] font-black text-loki-primary">{bulkProgress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-loki-primary transition-all duration-300" 
                                  style={{ width: `${bulkProgress}%` }} 
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                        className="px-4 py-2 bg-loki-primary/10 text-loki-primary hover:bg-loki-primary/20 border border-loki-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
                            className="flex-1 bg-zinc-900/50 border-2 border-zinc-800/50 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-loki-primary/30 transition-all"
                          />
                          <input 
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => {
                              const newParams = [...(endpointParams[selectedEndpoint.id] || [])];
                              newParams[idx] = { ...newParams[idx], value: e.target.value };
                              setEndpointParams(prev => ({ ...prev, [selectedEndpoint.id]: newParams }));
                            }}
                            className="flex-1 bg-zinc-900/50 border-2 border-zinc-800/50 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-loki-primary/30 transition-all"
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
                              ? 'bg-loki-primary/10 text-loki-primary border-loki-primary/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            STATUS: {testResults[selectedEndpoint.id].status}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            {formatDate(testResults[selectedEndpoint.id].timestamp)}
                          </span>
                        </div>
                        <pre className="bg-black/40 p-6 rounded-[2rem] border-2 border-zinc-800/50 text-[11px] font-mono text-loki-primary overflow-x-auto leading-relaxed">
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

                {activeEndpointTab === 'code' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        {['curl', 'js', 'python', 'go'].map((lang) => (
                          <button 
                            key={lang}
                            onClick={() => setSelectedLanguage(lang as any)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedLanguage === lang ? 'bg-loki-primary text-zinc-950' : 'text-zinc-500 hover:text-white'}`}
                          >
                            {lang === 'js' ? 'JavaScript' : lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          const snippet = selectedLanguage === 'curl' 
                            ? generateCurl(api, selectedEndpoint, endpointParams[selectedEndpoint.id] || [])
                            : generateSnippet(selectedLanguage, api, selectedEndpoint, endpointParams[selectedEndpoint.id] || []);
                          navigator.clipboard.writeText(snippet);
                          showToast('Snippet copied!', 'success');
                        }}
                        className="text-[10px] text-loki-primary hover:text-loki-accent font-black uppercase tracking-widest"
                      >
                        Copy Snippet
                      </button>
                    </div>
                    <pre className="bg-black/40 p-6 rounded-[2rem] border-2 border-zinc-800/50 text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {selectedLanguage === 'curl' 
                        ? generateCurl(api, selectedEndpoint, endpointParams[selectedEndpoint.id] || [])
                        : generateSnippet(selectedLanguage, api, selectedEndpoint, endpointParams[selectedEndpoint.id] || [])}
                    </pre>
                  </div>
                )}

                {activeEndpointTab === 'stats' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Avg Latency</span>
                        <span className="text-xl font-black text-white">{stats?.stats?.avgLatency || 0}ms</span>
                      </div>
                      <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Success Rate</span>
                        <span className="text-xl font-black text-loki-primary">{stats?.stats?.successRate || 0}%</span>
                      </div>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.latencyData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="time" stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
                          <YAxis stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                          />
                          <Bar dataKey="latency" fill="#00F5C8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
                            <span className={`w-2 h-2 rounded-full ${log.status >= 200 && log.status < 300 ? 'bg-loki-primary' : 'bg-red-500'}`} />
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-widest">Status {log.status}</p>
                              <p className="text-[10px] text-zinc-600 font-bold">{formatDate(log.timestamp)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setTestResults(prev => ({ 
                                ...prev, 
                                [selectedEndpoint.id]: { 
                                  status: log.status, 
                                  data: JSON.parse(log.response_body), 
                                  timestamp: new Date(log.timestamp) 
                                } 
                              }));
                              setActiveEndpointTab('payload');
                            }}
                            className="text-[10px] text-loki-primary hover:text-loki-accent font-black uppercase tracking-widest"
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
                  className="px-12 bg-loki-primary hover:bg-loki-accent text-zinc-950 shadow-loki-primary/20"
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
