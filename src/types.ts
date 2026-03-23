export interface UserRow {
  id: number;
  username: string;
  full_name: string;
  email: string;
  password: string;
  api_key: string;
  is_admin: number;
  failed_attempts: number;
  lock_until: string | null;
  plan_id: number | null;
  request_count: number;
  last_reset_date: string;
}

export interface ApiRow {
  id: number;
  user_id: number;
  name: string;
  base_url: string;
  auth_type: 'none' | 'apikey' | 'oauth2' | 'bearer' | 'basic';
  auth_config: string; // Encrypted JSON
  auth_endpoint: string | null;
  auth_username: string | null;
  auth_password: string | null;
  auth_payload_template: string | null;
  token: string | null; // Encrypted
  token_expires_at: string | null;
  last_refresh: string | null;
}

export interface EndpointRow {
  id: number;
  api_id: number;
  name: string;
  path: string;
  method: string;
  group_name: string;
  is_favorite: number;
}

export interface LogRow {
  id: number;
  endpoint_id: number;
  status: number;
  response_body: string;
  latency: number;
  timestamp: string;
}

export interface SessionRow {
  token: string;
  user_id: number;
  last_activity: string;
}

export interface PlanRow {
  id: number;
  name: string;
  request_limit: number;
  max_apis: number;
  max_endpoints: number;
  features: string; // JSON
  price: string;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  status: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
}

// Compatibility Aliases
export type User = UserRow;
export type ApiConfig = ApiRow;
export type Endpoint = EndpointRow;
export type Log = LogRow;
export type Plan = PlanRow;
