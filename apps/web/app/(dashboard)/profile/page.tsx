'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@devlife/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  phone_number?: string | null;
  phone_verified?: boolean;
  created_at: string;
  reminder_offset_hours?: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  // Carregar dados do usuário
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiClient.get('/users/me');
        if (response.success) {
          setUser(response.data);
          setName(response.data.name);
          setPhoneNumber(response.data.phone_number || '');
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Atualizar nome
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setUpdating(true);

    try {
      const response = await apiClient.patch('/users/me/name', { name });
      if (response.success) {
        setMessage('Nome atualizado com sucesso!');
        setUser({ ...user, name } as User);
      } else {
        setError(response.error?.message || 'Erro ao atualizar nome');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setUpdating(false);
    }
  };

  // 🆕 Salvar telefone
  const handleSavePhone = async () => {
    setSavingPhone(true);
    setPhoneMessage('');

    // Remove tudo que não for número
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setPhoneMessage('Telefone inválido. Use DDI + DDD + número (ex: 5511999999999)');
      setSavingPhone(false);
      return;
    }

    try {
      const response = await apiClient.patch('/users/me/phone', {
        phone_number: cleanPhone,
      });

      if (response.success) {
        setPhoneNumber(cleanPhone);
        setPhoneMessage('Telefone atualizado com sucesso!');
        setUser({ ...user, phone_number: cleanPhone } as User);
      } else {
        setPhoneMessage(response.error?.message || 'Erro ao salvar telefone');
      }
    } catch (err) {
      setPhoneMessage('Erro de conexão com o servidor');
    } finally {
      setSavingPhone(false);
    }
  };

  // 🆕 Remover telefone
  const handleRemovePhone = async () => {
    if (!confirm('Remover o número de telefone?')) return;

    setSavingPhone(true);
    setPhoneMessage('');

    try {
      const response = await apiClient.delete('/users/me/phone');
      if (response.success) {
        setPhoneNumber('');
        setPhoneMessage('Telefone removido');
        setUser({ ...user, phone_number: null } as User);
      } else {
        setPhoneMessage(response.error?.message || 'Erro ao remover telefone');
      }
    } catch (err) {
      setPhoneMessage('Erro de conexão com o servidor');
    } finally {
      setSavingPhone(false);
    }
  };

  // Alterar senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setUpdating(true);

    try {
      const response = await apiClient.patch('/users/me/password', {
        currentPassword,
        newPassword,
      });
      if (response.success) {
        setMessage('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.error?.message || 'Erro ao alterar senha');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setUpdating(false);
    }
  };

  // Excluir conta
  const handleDeleteAccount = async () => {
    if (
      !confirm(
        'Tem certeza que deseja excluir sua conta? Esta ação é irreversível!'
      )
    ) {
      return;
    }

    setError('');
    setMessage('');
    setUpdating(true);

    try {
      const response = await apiClient.delete('/users/me');
      if (response.success) {
        await apiClient.post('/auth/logout', {});
        router.push('/login');
      } else {
        setError(response.error?.message || 'Erro ao excluir conta');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Editar Nome</h2>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Atualizando...' : 'Atualizar Nome'}
          </button>
        </form>
      </div>

      {/* 🆕 Seção WhatsApp */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">WhatsApp</h2>
            <p className="text-sm text-gray-500">
              Receba lembretes de tarefas no WhatsApp
            </p>
          </div>
        </div>

        {phoneMessage && (
          <div
            className={`mb-3 px-3 py-2 rounded text-sm ${
              phoneMessage.includes('sucesso') || phoneMessage.includes('removido')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {phoneMessage}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de telefone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="5511999999999"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: DDI + DDD + número (ex: <strong>5511999999999</strong>)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSavePhone}
              disabled={savingPhone || !phoneNumber}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {savingPhone ? 'Salvando...' : 'Salvar Telefone'}
            </button>

            {user?.phone_number && (
              <button
                onClick={handleRemovePhone}
                disabled={savingPhone}
                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>

          {user?.phone_number && (
            <p className="text-xs text-gray-500">
              Número atual: <strong>{user.phone_number}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Senha Atual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nova Senha
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6 border border-red-200">
        <h2 className="text-xl font-semibold mb-4 text-red-600">
          Zona de Perigo
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Ao excluir sua conta, todos os seus dados serão removidos
          permanentemente.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={updating}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {updating ? 'Excluindo...' : 'Excluir Conta'}
        </button>
      </div>
    </div>
  );
}