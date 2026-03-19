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
    if (qs) {
      const separator = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';
      url += separator + qs;
    }
  }

  let curl = `curl -X ${ep.method} "${url}"`;
  
  // Auth
  if (api.auth_type === 'apikey') {
    curl += ` \\\n  -H "X-API-Key: YOUR_API_KEY"`;
  } else if (api.auth_type === 'oauth2') {
    curl += ` \\\n  -H "Authorization: Bearer {{token_api_${api.id}}}"`;
  }
  curl += ` \\\n  -H "accept: application/json"`;
  
  if (ep.method !== 'GET') {
    curl += ` \\\n  -H "Content-Type: application/json"`;
  }

  // Body params for non-GET
  if (params.length > 0 && ep.method !== 'GET') {
    const bodyObj = params.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    curl += ` \\\n  -d '${JSON.stringify(bodyObj, null, 2)}'`;
  }

  return curl;
};

export const generateSnippet = (lang: 'js' | 'python' | 'go', api: ApiConfig, ep: Endpoint, params: { key: string, value: string }[] = []) => {
  const baseUrl = api.base_url.replace(/\/+$/, '');
  const path = ep.path.replace(/^\/+/, '');
  let url = `${baseUrl}/${path}`;
  
  // Add query params for GET
  if (ep.method === 'GET' && params.length > 0) {
    const qs = params
      .filter(p => p.key && p.value)
      .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    if (qs) {
      const separator = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';
      url += separator + qs;
    }
  }
  
  const bodyObj = params.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (ep.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  if (api.auth_type === 'apikey') {
    headers['X-API-Key'] = 'YOUR_API_KEY';
  } else if (api.auth_type === 'oauth2') {
    headers['Authorization'] = `Bearer {{token_api_${api.id}}}`;
  }

  if (lang === 'js') {
    return `fetch("${url}", {
  method: "${ep.method}",
  headers: ${JSON.stringify(headers, null, 2)},
  ${ep.method !== 'GET' ? `body: JSON.stringify(${JSON.stringify(bodyObj, null, 2)})` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));`;
  }

  if (lang === 'python') {
    return `import requests

url = "${url}"
headers = ${JSON.stringify(headers, null, 2)}
${ep.method !== 'GET' ? `payload = ${JSON.stringify(bodyObj, null, 2)}` : ''}

response = requests.request("${ep.method}", url, headers=headers${ep.method !== 'GET' ? ', json=payload' : ''})

print(response.text)`;
  }

  if (lang === 'go') {
    return `package main

import (
	"fmt"
	"net/http"
	"io/ioutil"
	${ep.method !== 'GET' ? '"bytes"\n\t"encoding/json"' : ''}
)

func main() {
	url := "${url}"
	method := "${ep.method}"

	${ep.method !== 'GET' ? `payload, _ := json.Marshal(${JSON.stringify(bodyObj)})
	req, _ := http.NewRequest(method, url, bytes.NewBuffer(payload))` : `req, _ := http.NewRequest(method, url, nil)`}

	${Object.entries(headers).map(([k, v]) => `req.Header.Add("${k}", "${v}")`).join('\n\t')}

	client := &http.Client{}
	res, _ := client.Do(req)
	defer res.Body.Close()

	body, _ := ioutil.ReadAll(res.Body)
	fmt.Println(string(body))
}`;
  }

  return '';
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
