import { ApiConfig, Endpoint } from '../types';

export const generateCurl = (api: ApiConfig, ep: Endpoint, params: { key: string, value: string }[] = []) => {
  const baseUrl = api.base_url.replace(/\/+$/, '');
  const path = ep.path.replace(/^\/+/, '');
  let url = `${baseUrl}/${path}`;
  
  // Add query params for GET
  if (ep.method === 'GET' && params.length > 0) {
    const qs = params
      .filter(p => p.key && p.value)
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  let curl = `curl -X ${ep.method} "${url}"`;
  
  // Auth
  if (api.auth_type === 'apikey') {
    curl += ` \\\n  -H "X-API-Key: YOUR_API_KEY"`;
  } else if (api.auth_type === 'oauth2') {
    curl += ` \\\n  -H "Authorization: bearer {{token_api_${api.id}}}"`;
  }
  curl += ` \\\n  -H "accept: application/json"`;
  curl += ` \\\n  -H "Content-Type: application/json"`;

  // Body params for non-GET
  if (params.length > 0 && ep.method !== 'GET') {
    const bodyObj = params.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    curl += ` \\\n  -d '${JSON.stringify(bodyObj, null, 2)}'`;
  }

  return curl;
};

export const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const truncate = (str: string, len: number) => {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
};
