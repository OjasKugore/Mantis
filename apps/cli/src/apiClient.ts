import { ofetch, FetchError } from 'ofetch';
import { getConfig, saveConfig } from './config.js';

export class CliApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CliApiError';
  }
}

export function getClient() {
  const config = getConfig();
  const baseUrl = config.apiUrl.replace(/\/$/, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.cookie) {
    headers['Cookie'] = config.cookie;
  }

  return ofetch.create({
    baseURL: baseUrl,
    headers,
    async onResponse({ response }: { response: any }) {
      // Capture session cookies
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Extract the session cookie (session=... or bugzilla_session=...)
        const match = setCookie.match(/((?:session|bugzilla_session)=[^;]+)/);
        if (match) {
          saveConfig({ cookie: match[1] });
        }
      }
    },
    async onResponseError({ response }: { response: any }) {
      const data = response._data || {};
      const message = data.message || data.error || response.statusText || 'API Request failed';
      const code = data.error || 'API_ERROR';
      throw new CliApiError(response.status, code, message);
    },
  });
}

export async function apiGet<T>(path: string, query?: Record<string, any>): Promise<T> {
  const client = getClient();
  return client<T>(path, { method: 'GET', query });
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const client = getClient();
  return client<T>(path, { method: 'POST', body });
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const client = getClient();
  return client<T>(path, { method: 'PATCH', body });
}

export async function apiDelete<T>(path: string): Promise<T> {
  const client = getClient();
  return client<T>(path, { method: 'DELETE' });
}
