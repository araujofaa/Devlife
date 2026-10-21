import { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { apiClient } from '@devlife/api-client';
import { router } from 'expo-router';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Verifica se já existe um token salvo no celular
    const token = await storage.getToken('access_token');
    setIsAuthenticated(!!token);
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    
    if (response.success && response.data?.accessToken) {
      // 🆕 Salva os tokens REAIS retornados pelo backend
      await storage.setToken('access_token', response.data.accessToken);
      
      if (response.data.refreshToken) {
        await storage.setToken('refresh_token', response.data.refreshToken);
      }

      setIsAuthenticated(true);
      router.replace('/(app)/tasks'); // Redireciona para a lista de tarefas
    } else {
      throw new Error(response.error?.message || 'Erro ao fazer login');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    if (response.success) {
      // Após o cadastro, faz o login automático para pegar os tokens
      await login(email, password);
    } else {
      throw new Error(response.error?.message || 'Erro ao cadastrar');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (e) {
      // Ignora erros de rede no logout
    } finally {
      await storage.removeToken('access_token');
      await storage.removeToken('refresh_token');
      setIsAuthenticated(false);
      router.replace('/(auth)/login');
    }
  };

  return { isLoading, isAuthenticated, login, register, logout };
}