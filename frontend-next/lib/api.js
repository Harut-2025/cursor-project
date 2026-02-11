import axios from 'axios';

export const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE || 'http://backend:4000'
    : process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export function createApiClient(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return axios.create({
    baseURL: `${API_BASE}/api`,
    headers,
  });
}

