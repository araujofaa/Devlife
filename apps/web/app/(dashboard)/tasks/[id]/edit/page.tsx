'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import CategorySelector from '@/components/CategorySelector';
import RecurrenceSelector from '@/components/RecurrenceSelector';
import toast from 'react-hot-toast';
import { formatApiDateTime, apiDateToLocalInput, localInputToApiDate } from '@/lib/datetime';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    start_date: '', // 🆕
    due_date: '',
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState({
    type: null as string | null,
    interval: 1,
    endDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await apiClient.get(`/tasks/${id}`);
        if (response.success) {
          const task = response.data;
          setForm({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            status: task.status,
            start_date: task.start_date ? apiDateToLocalInput(task.start_date) : '', // 🆕
            due_date: task.due_date ? apiDateToLocalInput(task.due_date) : '',
          });
          setCategoryIds(task.categories?.map((tc: any) => tc.category.id) || []);
          setRecurrence({
            type: task.recurrence_type || null,
            interval: task.recurrence_interval || 1,
            endDate: task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '',
          });
        } else {
          setError('Tarefa não encontrada');
        }
      } catch {
        setError('Erro ao carregar tarefa');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTask();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    try {
      const payload = {
        ...form,
        start_date: form.start_date ? localInputToApiDate(form.start_date) : null, // 🆕
        due_date: form.due_date ? localInputToApiDate(form.due_date) : null,
        categoryIds,
        recurrence_type: recurrence.type,
        recurrence_interval: recurrence.interval,
        recurrence_end_date: recurrence.endDate
          ? new Date(recurrence.endDate).toISOString()
          : null,
      };

      const response = await apiClient.patch(`/tasks/${id}`, payload);
      if (response.success) {
        toast.success('Tarefa atualizada!');
        router.push('/tasks');
      } else {
        setError(response.error?.message || 'Erro ao atualizar');
        toast.error('Erro ao atualizar');
      }
    } catch {
      setError('Erro de conexão');
      toast.error('Erro de conexão');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Editar Tarefa</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          />
        </div>

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
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="pending">Pendente</option>
              <option value="done">Concluída</option>
            </select>
          </div>
        </div>

        {/* 🆕 Datas de Início e Vencimento */}
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

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Categorias
          </label>
          <CategorySelector selectedIds={categoryIds} onChange={setCategoryIds} />
        </div>

        <div>
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Atualizando...' : 'Atualizar Tarefa'}
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