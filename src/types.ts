export interface User {
  id: number;
  username: string;
}

export interface ApiConfig {
  id: number;
  user_id: number;
  name: string;
  base_url: string;
  auth_type: 'oauth2' | 'apikey' | 'none';
  auth_config: string; // Encrypted JSON
  auth_endpoint?: string;
  auth_username?: string;
  auth_password?: string;
  token?: string;
  token_expires_at?: string;
  last_refresh?: string;
}

export interface Endpoint {
  id: number;
  api_id: number;
  name: string;
  path: string;
  method: string;
  group_name: string;
  is_favorite: number;
}

export interface Log {
  id: number;
  endpoint_id: number;
  status: number;
  response_body: string;
  timestamp: string;
}

export interface AuthData {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  headerName?: string;
}
