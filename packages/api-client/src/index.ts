import { ApiResponse } from '@devlife/types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  _retry?: boolean;
}

export interface TokenAdapter {
  getToken(): Promise<string | null>;
  getRefreshToken?(): Promise<string | null>;
  setTokens?(access: string, refresh?: string): Promise<void>;
  clear?(): Promise<void>;
}

class ApiClient {
  private baseURL: string;
  private tokenAdapter: TokenAdapter | null = null;
  private refreshing: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setTokenAdapter(adapter: TokenAdapter) {
    this.tokenAdapter = adapter;
  }

  private async doRefresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        const refreshToken = this.tokenAdapter?.getRefreshToken
          ? await this.tokenAdapter.getRefreshToken()
          : null;
        const body = refreshToken ? { refreshToken } : {};

        const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (!refreshResponse.ok) return false;

        if (this.tokenAdapter?.setTokens) {
          try {
            const payload = await refreshResponse.json();
            const newAccess = payload?.data?.accessToken;
            const newRefresh = payload?.data?.refreshToken;
            if (newAccess) await this.tokenAdapter.setTokens(newAccess, newRefresh);
          } catch { /* web */ }
        }
        return true;
      } catch (err) {
        await this.tokenAdapter?.clear?.();
        return false;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  private async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = { ...options.headers };
    const isFormData = options.body instanceof FormData;

    // Não define Content-Type se for FormData (o fetch define automaticamente com o boundary)
    if (options.body && !isFormData && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.tokenAdapter) {
      const token = await this.tokenAdapter.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method: options.method || 'GET',
      headers,
      body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
      credentials: 'include',
    };

    const response = await fetch(url, config);

    if (response.status === 401 && !options._retry) {
      const refreshed = await this.doRefresh();
      if (refreshed) return this.request<T>(endpoint, { ...options, _retry: true });
      await this.tokenAdapter?.clear?.();
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  }

  get<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }
  post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }
  patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }
  delete<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  // 🆕 Método específico para envio de arquivos (FormData)
  postForm<T = any>(endpoint: string, formData: FormData) {
    return this.request<T>(endpoint, { method: 'POST', body: formData });
  }
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3333';

export const apiClient = new ApiClient(apiUrl);