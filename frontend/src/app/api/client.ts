import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth-store';
import type {
  ApiEnvelope,
  AppBootstrapData,
  AuthResponse,
  CurrentUser,
  Market,
  MessageThread,
  ProfileBundle,
  ServiceOrder,
  TravelPlan,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  traceId?: string;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, traceId?: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.traceId = traceId;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const token = getAccessToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed: ${response.status}`,
      response.status,
      payload?.error?.trace_id,
      payload?.error?.field_errors ?? {},
    );
  }
  return payload.data as T;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ access_token: string }> | null;
  if (!response.ok || !payload?.success || !payload.data?.access_token) {
    clearTokens();
    return false;
  }
  const existingRefreshToken = getRefreshToken();
  if (!existingRefreshToken) {
    return false;
  }
  saveTokens({
    access_token: payload.data.access_token,
    refresh_token: existingRefreshToken,
    token_type: 'bearer',
  });
  return true;
}

export const apiClient = {
  login(identifier: string, password: string) {
    return request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ provider: 'email', identifier, password }),
    });
  },
  register(identifier: string, password: string, displayName: string) {
    return request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'email',
        identifier,
        password,
        display_name: displayName,
        preferred_locale: 'en-US',
        preferred_currency: 'CNY',
      }),
    });
  },
  me() {
    return request<CurrentUser>('/api/v1/auth/me');
  },
  markets() {
    return request<Market[]>('/api/v1/markets', {}, false);
  },
  profiles() {
    return request<ProfileBundle>('/api/v1/me/profiles');
  },
  travelPlans(marketId: string) {
    return request<TravelPlan[]>(`/api/v1/markets/${marketId}/travel-plans`);
  },
  messageThreads(marketId: string) {
    return request<MessageThread[]>(`/api/v1/markets/${marketId}/message-threads`);
  },
  orders(marketId: string) {
    return request<ServiceOrder[]>(`/api/v1/markets/${marketId}/orders`);
  },
  async bootstrap(): Promise<AppBootstrapData> {
    const markets = await apiClient.markets();
    const selectedMarket = markets[0] ?? null;
    if (!selectedMarket || !getAccessToken()) {
      return {
        markets,
        selectedMarket,
        profiles: null,
        travelPlans: [],
        messageThreads: [],
        orders: [],
      };
    }
    const [profiles, travelPlans, messageThreads, orders] = await Promise.all([
      apiClient.profiles().catch(() => null),
      apiClient.travelPlans(selectedMarket.id).catch(() => []),
      apiClient.messageThreads(selectedMarket.id).catch(() => []),
      apiClient.orders(selectedMarket.id).catch(() => []),
    ]);
    return { markets, selectedMarket, profiles, travelPlans, messageThreads, orders };
  },
};
