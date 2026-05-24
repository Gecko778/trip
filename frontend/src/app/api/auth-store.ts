import type { AuthTokens } from './types';

const ACCESS_TOKEN_KEY = 'trip.access_token';
const REFRESH_TOKEN_KEY = 'trip.refresh_token';

export function readTokens(): AuthTokens | null {
  const access_token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh_token = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!access_token || !refresh_token) {
    return null;
  }
  return { access_token, refresh_token, token_type: 'bearer' };
}

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
