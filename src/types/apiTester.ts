export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiAuth {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: {
    type: BodyType;
    content: string;
  };
  auth: ApiAuth;
  createdAt: number;
  updatedAt: number;
}

export interface ApiResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  responseTime: number;
  timestamp: number;
}

export interface RequestTab {
  id: string;
  requestId: string;
  name: string;
  isDirty: boolean;
}

export interface HistoryEntry {
  id: string;
  request: ApiRequest;
  response?: ApiResponse;
  timestamp: number;
}

export interface WebhookServer {
  id: string;
  port: number;
  path: string;
  isRunning: boolean;
}

export interface WebhookRequest {
  id: string;
  serverId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

const DEFAULT_AUTH: ApiAuth = {
  type: 'none',
};

const DEFAULT_BODY = {
  type: 'none' as BodyType,
  content: '',
};

export function createEmptyRequest(): ApiRequest {
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: { ...DEFAULT_BODY },
    auth: { ...DEFAULT_AUTH },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createKeyValuePair(key = '', value = ''): KeyValuePair {
  return {
    id: crypto.randomUUID(),
    key,
    value,
    enabled: true,
  };
}
