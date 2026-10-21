'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@devlife/api-client';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Verifica autenticação ao montar o hook
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Tenta buscar o perfil do usuário – se retornar 200, está autenticado
        const response = await apiClient.get('/users/me');
        if (response.success) {
          setIsAuthenticated(true);
          setUser(response.data);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        router.push('/dashboard');
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || 'Erro ao fazer login' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro de conexão' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        router.push('/dashboard');
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || 'Erro ao cadastrar' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro de conexão' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Erro ao fazer logout', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      router.push('/login');
    }
  };

  return { isAuthenticated, isLoading, user, login, register, logout };
}