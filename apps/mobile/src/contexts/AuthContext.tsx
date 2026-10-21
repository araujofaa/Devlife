import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { router } from 'expo-router';
import { apiClient } from '@devlife/api-client';
import { storage } from '@/src/services/storage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  phone_verified?: boolean;
  email_verified?: boolean;
  reminder_offset_hours?: number;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const loadUser = async () => {
    try {
      const res = await apiClient.get<AuthUser>('/users/me');
      if (res.success && res.data) setUser(res.data);
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    (async () => {
      const token = await storage.getToken('access_token');
      setIsAuthenticated(!!token);
      
      if (token) {
        await loadUser();
      }
      
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<{
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { email, password });

    if (!res.success) throw new Error(res.error?.message ?? 'Falha ao autenticar');
    if (!res.data?.accessToken) throw new Error('Resposta inválida do servidor');

    await storage.setToken('access_token', res.data.accessToken);
    await storage.setToken('refresh_token', res.data.refreshToken);
    
    setUser(res.data.user);
    setIsAuthenticated(true);

    router.replace('/(app)/tasks');
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<string> => {
    const res = await apiClient.post<{ message: string }>('/auth/register', {
      name,
      email,
      password,
    });
    if (!res.success) throw new Error(res.error?.message ?? 'Falha ao criar conta');
    return res.data?.message ?? 'Conta criada. Verifique seu e-mail para ativar.';
  };

  const logout = async () => {
    const refreshToken = await storage.getToken('refresh_token');
    try {
      await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      /* ignora */
    }
    await storage.removeToken('access_token');
    await storage.removeToken('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    router.replace('/(auth)/login');
  };

  const refreshUser = loadUser;

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}