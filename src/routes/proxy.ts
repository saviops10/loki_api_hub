import { Hono } from "hono";
import { db } from "../db/index.js";
import { ProxyRequestSchema } from "../schemas/proxy.js";
import { validateApiKey } from "../middlewares/auth.js";
import { rateLimitMiddleware } from "../middlewares/rateLimit.js";
import { ApiRow, EndpointRow, AppEnv } from "../types.js";
import { encrypt, decrypt, scrubData } from "../utils/security.js";
import { validateUrlForSsrf } from "../utils/ssrf.js";
import { checkCircuitBreaker, recordApiSuccess, recordApiFailure, refreshApiToken } from "../services/apiService.js";

const proxy = new Hono<AppEnv>();

async function backgroundLog(endpointId: number, status: number, responseBody: string, latency: number, userId: number) {
  try {
    await db.run("INSERT INTO logs (endpoint_id, status, response_body, latency) VALUES (?, ?, ?, ?)", 
      [endpointId, status, responseBody, latency]);
    await db.run("UPDATE users SET request_count = request_count + 1 WHERE id = ?", [userId]);
  } catch (e) {
    console.error("[LOG] Background logging failed:", e);
  }
}

proxy.post("/", rateLimitMiddleware, validateApiKey, async (c) => {
  const startTime = Date.now();
  const userId = c.get('userId');
  const body = await c.req.json();
  
  const validation = ProxyRequestSchema.safeParse(body);
  if (!validation.success) return c.json({ error: "Invalid proxy request" }, 400);

  const { apiId, endpointId, body: reqBody, headers: customHeaders, params } = validation.data;

  try {
    const api = await db.get<ApiRow>("SELECT * FROM apis WHERE id = ? AND user_id = ?", [apiId, userId]);
    const endpoint = await db.get<EndpointRow>("SELECT * FROM endpoints WHERE id = ? AND api_id = ?", [endpointId, apiId]);

    if (!api || !endpoint) return c.json({ error: "API or Endpoint not found" }, 404);
    if (!await validateUrlForSsrf(api.base_url)) return c.json({ error: "Invalid target URL" }, 400);
    if (!await checkCircuitBreaker(apiId)) return c.json({ error: "Service unavailable" }, 503);

    let token = api.token ? decrypt(api.token) : null;
    if (api.auth_type !== 'none' && api.auth_endpoint && (!token || (api.token_expires_at && new Date(api.token_expires_at) < new Date()))) {
      token = await refreshApiToken(apiId);
    }

    let baseUrl = api.base_url.replace(/\/+$/, '');
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    const path = endpoint.path.replace(/^\/+/, '');
    let url = endpoint.path.startsWith('http') ? endpoint.path : `${baseUrl}/${path}`;
    
    if (params) {
      const searchParams = new URLSearchParams(params as Record<string, string>);
      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    const requestHeaders: Record<string, string> = { 'Accept': 'application/json', ...customHeaders };
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) requestHeaders['Content-Type'] = 'application/json';

    if (token) {
      if (api.auth_type === 'bearer' || api.auth_type === 'oauth2') {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      } else if (api.auth_type === 'apikey') {
        const authConfig = JSON.parse(decrypt(api.auth_config));
        requestHeaders[authConfig.keyName || 'X-API-Key'] = token;
      } else if (api.auth_type === 'basic' && api.auth_username && api.auth_password) {
        const credentials = btoa(`${api.auth_username}:${api.auth_password}`);
        requestHeaders['Authorization'] = `Basic ${credentials}`;
      }
    }

    const executeRequest = async (tokenOverride?: string) => {
      const headers = { ...requestHeaders };
      if (tokenOverride && (api.auth_type === 'bearer' || api.auth_type === 'oauth2')) {
        headers['Authorization'] = `Bearer ${tokenOverride}`;
      }

      const fetchOptions: any = {
        method: endpoint.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        fetchOptions.body = JSON.stringify(reqBody || {});
      }

      const response = await fetch(url, fetchOptions);
      if (response.ok) await recordApiSuccess(apiId);
      else if (response.status >= 500) await recordApiFailure(apiId);
      return response;
    };

    let response = await executeRequest(token || undefined);

    if (response.status === 401 && api.auth_endpoint) {
      const newToken = await refreshApiToken(apiId);
      if (newToken) response = await executeRequest(newToken);
    }

    const latency = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    
    if (contentType.includes('application/json')) {
      responseData = await response.json().catch(() => ({ error: "Failed to parse JSON response" }));
    } else {
      responseData = await response.text().catch(() => "Failed to read response text");
    }

    const logBody = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
    backgroundLog(endpointId, response.status, scrubData(logBody), latency, userId).catch(console.error);

    return c.json(responseData, response.status as any);
  } catch (error: any) {
    const latency = Date.now() - startTime;
    await recordApiFailure(apiId);
    backgroundLog(endpointId, 500, JSON.stringify({ error: error.message }), latency, userId).catch(console.error);
    return c.json({ error: "Proxy request failed", details: error.message }, 500);
  }
});

export default proxy;
