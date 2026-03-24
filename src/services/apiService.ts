import { db, getKV } from "../db/index.js";
import { ApiRow, CircuitBreakerState } from "../types.js";
import { encrypt, decrypt } from "../utils/security.js";

const FAILURE_THRESHOLD = 5;
const COOLDOWN_PERIOD = 60 * 1000; // 1 minute

export async function getCircuitBreaker(apiId: number): Promise<CircuitBreakerState> {
  const kvInstance = getKV();
  const key = `circuit:${apiId}`;
  
  if (kvInstance) {
    const data = await kvInstance.get(key);
    if (data) return JSON.parse(data) as CircuitBreakerState;
  }
  
  return { failures: 0, lastFailure: 0, status: 'CLOSED' };
}

export async function saveCircuitBreaker(apiId: number, state: CircuitBreakerState) {
  const kvInstance = getKV();
  const key = `circuit:${apiId}`;
  
  if (kvInstance) {
    await kvInstance.put(key, JSON.stringify(state), { expirationTtl: 86400 });
  }
}

export async function checkCircuitBreaker(apiId: number): Promise<boolean> {
  const cb = await getCircuitBreaker(apiId);
  if (cb.status === 'CLOSED') return true;

  if (cb.status === 'OPEN') {
    if (Date.now() - cb.lastFailure > COOLDOWN_PERIOD) {
      cb.status = 'HALF_OPEN';
      await saveCircuitBreaker(apiId, cb);
      return true;
    }
    return false;
  }
  return true;
}

export async function recordApiSuccess(apiId: number) {
  const cb = await getCircuitBreaker(apiId);
  if (cb.failures > 0 || cb.status !== 'CLOSED') {
    await saveCircuitBreaker(apiId, { failures: 0, lastFailure: 0, status: 'CLOSED' });
  }
}

export async function recordApiFailure(apiId: number) {
  const cb = await getCircuitBreaker(apiId);
  cb.failures += 1;
  cb.lastFailure = Date.now();
  
  if (cb.failures >= FAILURE_THRESHOLD) {
    cb.status = 'OPEN';
  }
  
  await saveCircuitBreaker(apiId, cb);
}

export async function refreshApiToken(apiId: number): Promise<string | null> {
  const api = await db.get<ApiRow>("SELECT * FROM apis WHERE id = ?", [apiId]);
  if (!api || !api.auth_endpoint) return null;

  let authEndpoint = api.auth_endpoint;
  const urlHasPlaceholders = authEndpoint.includes('{{username}}') || authEndpoint.includes('{{password}}');
  
  authEndpoint = authEndpoint.replace('{{username}}', encodeURIComponent(api.auth_username || ''));
  authEndpoint = authEndpoint.replace('{{password}}', encodeURIComponent(api.auth_password || ''));

  if (authEndpoint.startsWith('/')) {
    const base = api.base_url.replace(/\/+$/, '');
    authEndpoint = `${base}${authEndpoint}`;
  } else if (!authEndpoint.startsWith('http')) {
    const base = api.base_url.replace(/\/+$/, '');
    authEndpoint = `${base}/${authEndpoint}`;
  }
  
  if (!authEndpoint.startsWith('http')) {
    authEndpoint = `https://${authEndpoint}`;
  }

  const tryRefresh = async (payload: any) => {
    try {
      const hasPayload = payload && Object.keys(payload).length > 0;
      const method = (urlHasPlaceholders && !hasPayload) ? 'GET' : 'POST';

      const fetchOptions: any = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (method === 'POST') {
        fetchOptions.body = JSON.stringify(payload || {});
      }

      const response = await fetch(authEndpoint, fetchOptions);

      if (!response.ok) return null;
      return await response.json();
    } catch (e: any) {
      console.error(`[AUTH] Network error during refresh for API ${apiId}:`, e.message || e);
      return null;
    }
  };

  try {
    let data: any = null;
    if (urlHasPlaceholders) data = await tryRefresh({});
    if (!data && api.auth_payload_template) {
      try {
        let template = api.auth_payload_template;
        template = template.replace('{{username}}', api.auth_username || '');
        template = template.replace('{{password}}', api.auth_password || '');
        data = await tryRefresh(JSON.parse(template));
      } catch (e) {}
    }
    if (!data) {
      data = await tryRefresh({ username: api.auth_username, password: api.auth_password });
      if (!data) data = await tryRefresh({ user: api.auth_username, password: api.auth_password });
      if (!data) data = await tryRefresh({ UserName: api.auth_username, Password: api.auth_password });
    }

    if (!data) return null;

    const token = data.token || data.access_token || data.accessToken || (data.data && data.data.token) || (data.data && data.data.access_token);
    if (!token) return null;

    let expires_at: string;
    if (data.token_expires_at || data.expires_at || (data.data && (data.data.token_expires_at || data.data.expires_at))) {
      expires_at = new Date(data.token_expires_at || data.expires_at || (data.data && (data.data.token_expires_at || data.data.expires_at))).toISOString();
    } else {
      const expires_in = data.expires_in || data.expiresIn || (data.data && (data.data.expires_in || data.data.expiresIn)) || 3600;
      expires_at = new Date(Date.now() + expires_in * 1000).toISOString();
    }
    
    const last_refresh = new Date().toISOString();
    const encryptedToken = encrypt(token);
    await db.run("UPDATE apis SET token = ?, token_expires_at = ?, last_refresh = ? WHERE id = ?", 
      [encryptedToken, expires_at, last_refresh, apiId]);

    return token;
  } catch (error) {
    console.error(`[AUTH] Critical error refreshing token for API ${apiId}:`, error);
    return null;
  }
}
