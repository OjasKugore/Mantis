import { config } from './config.js';

export class CliApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'CliApiError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const currentConfig = config.get();
  const baseUrl = currentConfig.apiUrl.replace(/\/$/, '');
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach session cookies if available
  const cookieParts: string[] = [];
  if (currentConfig.sessionId) {
    cookieParts.push(`sessionId=${currentConfig.sessionId}`);
    cookieParts.push(`session=${currentConfig.sessionId}`);
  }
  if (currentConfig.userToken) {
    cookieParts.push(`mantis_user_token=${currentConfig.userToken}`);
  }
  if (cookieParts.length > 0) {
    headers['Cookie'] = cookieParts.join('; ');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new CliApiError(
      0,
      `Could not connect to Mantis server at ${baseUrl} (${err.message}).\n` +
      `  💡 Is your dev server running? Try: 'npm run dev:web' or 'npm --prefix apps/web run dev'\n` +
      `  💡 Or connect to your live Vercel app: 'npm run mantis -- --api-url https://mantis-clonefest.vercel.app auth login --persona alice'`
    );
  }

  // Check Set-Cookie headers for session updates
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const sessionMatch = setCookie.match(/sessionId=([^;]+)/);
    const tokenMatch = setCookie.match(/mantis_user_token=([^;]+)/);
    if (sessionMatch || tokenMatch) {
      config.save({
        sessionId: sessionMatch ? sessionMatch[1] : currentConfig.sessionId,
        userToken: tokenMatch ? tokenMatch[1] : currentConfig.userToken,
      });
    }
  }

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    const message = errorData.message || errorData.error || `HTTP ${response.status} ${response.statusText}`;
    throw new CliApiError(response.status, message, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
