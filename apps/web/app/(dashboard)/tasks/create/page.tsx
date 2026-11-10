'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@devlife/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // 🆕 Importação do React Query
import CategorySelector from '@/components/CategorySelector';
import RecurrenceSelector from '@/components/RecurrenceSelector';
import toast from 'react-hot-toast';

export default function CreateTaskPage() {
  const router = useRouter();
  const queryClient = useQueryClient(); // 🆕 Hook do React Query

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    start_date: '',
    due_date: '',
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState({
    type: null as string | null,
    interval: 1,
    endDate: '',
  });
  
  const [error, setError] = useState('');

  // 🆕 Mutação para criar a tarefa
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.post('/tasks', payload);
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao criar tarefa');
      }
      return response.data;
    },
    onSuccess: () => {
      // 🆕 Invalida todos os caches relacionados para atualizar a tela instantaneamente
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Lista principal de tarefas e filtros
      queryClient.invalidateQueries({ queryKey: ['tasks', 'counts'] }); // Contadores das abas
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] }); // Calendário
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }); // Gráficos do Dashboard
      
      toast.success('Tarefa criada!');
      router.push('/tasks');
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
      categoryIds,
      recurrence_type: recurrence.type,
      recurrence_interval: recurrence.interval,
      recurrence_end_date: recurrence.endDate
        ? new Date(recurrence.endDate).toISOString()
        : null,
    };

    // 🆕 Dispara a mutação
    createTaskMutation.mutate(payload);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Nova Tarefa
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Título *
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="Digite o título"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="Digite a descrição (opcional)"
          />
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Prioridade
          </label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </select>
        </div>

        {/* Datas de Início e Vencimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Data de Início
            </label>
            <input
              type="datetime-local"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Data de Vencimento
            </label>
            <input
              type="datetime-local"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Categorias */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Categorias
          </label>
          <CategorySelector selectedIds={categoryIds} onChange={setCategoryIds} />
        </div>

        {/* Recorrência */}
        <div>
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
        </div>

        {/* Botões */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={createTaskMutation.isPending} // 🆕 Usa o estado da mutação
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createTaskMutation.isPending ? 'Criando...' : 'Criar Tarefa'}
          </button>
          <Link
            href="/tasks"
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-400"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}