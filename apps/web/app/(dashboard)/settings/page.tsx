'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@devlife/api-client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function SettingsPage() {
  const [offset, setOffset] = useState(24);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { permission, isSubscribed, subscribe, unsubscribe, loading: pushLoading } =
    usePushNotifications();

  // Carregar configuração atual
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/users/me');
        if (response.success) {
          setOffset(response.data.reminder_offset_hours || 24);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await apiClient.patch('/users/me/settings', {
        reminder_offset_hours: offset,
      });
      if (response.success) {
        setMessage('Configurações salvas com sucesso!');
      } else {
        setMessage('Erro ao salvar configurações');
      }
    } catch (err) {
      setMessage('Erro de conexão');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Notificações Push</h2>
        <div className="flex items-center gap-4">
          {permission === 'denied' ? (
            <p className="text-red-600">
              Permissão negada. Habilite as notificações nas configurações do navegador.
            </p>
          ) : (
            <>
              <button
                onClick={subscribe}
                disabled={isSubscribed || pushLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubscribed ? 'Inscrito' : 'Ativar Notificações'}
              </button>
              {isSubscribed && (
                <button
                  onClick={unsubscribe}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Desativar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Lembrete de Tarefas</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Horas de antecedência</label>
            <select
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="mt-1 block w-full border px-3 py-2 rounded"
            >
              <option value={6}>6 horas</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
              <option value={72}>72 horas</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Você receberá lembretes com essa antecedência antes do vencimento.
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Salvar
          </button>
        </form>
      </div>
    </div>
  );
}