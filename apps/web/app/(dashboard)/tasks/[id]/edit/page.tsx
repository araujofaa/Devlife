'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CategorySelector from '@/components/CategorySelector';
import RecurrenceSelector from '@/components/RecurrenceSelector';
import toast from 'react-hot-toast';
import { formatApiDateTime, apiDateToLocalInput, localInputToApiDate } from '@/lib/datetime';
import { 
  CheckIcon, 
  PlusIcon, 
  TrashIcon, 
  ClockIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string | null;
}

function EditTaskContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const id = params.id as string;
  const highlightSubtaskId = searchParams.get('subtask');

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
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [error, setError] = useState('');

  // Refs para rolar até a subtarefa e focar no input
  const subtaskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const subtaskInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 🆕 QUERY: Buscar a tarefa
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks/${id}`);
      if (!response.success) throw new Error('Tarefa não encontrada');
      return response.data;
    },
    enabled: !!id,
  });

  // Sincroniza o estado do formulário quando a tarefa é carregada
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        start_date: task.start_date ? apiDateToLocalInput(task.start_date) : '',
        due_date: task.due_date ? apiDateToLocalInput(task.due_date) : '',
      });
      setCategoryIds(task.categories?.map((tc: any) => tc.category.id) || []);
      setRecurrence({
        type: task.recurrence_type || null,
        interval: task.recurrence_interval || 1,
        endDate: task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '',
      });
      setSubtasks(task.subtasks || []);
    }
  }, [task]);

  // Efeito para rolar até a subtarefa se ela foi solicitada na URL
  useEffect(() => {
    if (highlightSubtaskId && subtaskRefs.current[highlightSubtaskId] && !isLoading) {
      setTimeout(() => {
        subtaskRefs.current[highlightSubtaskId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        subtaskInputRefs.current[highlightSubtaskId]?.focus();
      }, 200);
    }
  }, [highlightSubtaskId, isLoading, subtasks.length]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🆕 MUTATION: Atualizar Tarefa Principal
  const updateTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.patch(`/tasks/${id}`, payload);
      if (!response.success) throw new Error(response.error?.message || 'Erro ao atualizar');
      return response.data;
    },
    onSuccess: () => {
      // Invalida os caches para atualizar todas as telas
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      
      toast.success('Tarefa atualizada!');
      router.push('/tasks');
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      start_date: form.start_date ? localInputToApiDate(form.start_date) : null,
      due_date: form.due_date ? localInputToApiDate(form.due_date) : null,
      categoryIds,
      recurrence_type: recurrence.type,
      recurrence_interval: recurrence.interval,
      recurrence_end_date: recurrence.endDate
        ? new Date(recurrence.endDate).toISOString()
        : null,
    };

    updateTaskMutation.mutate(payload);
  };

  // 🆕 MUTATION: Atualizar Subtarefa (com Optimistic UI)
  const updateSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, data }: { subtaskId: string, data: Partial<Subtask> }) =>
      apiClient.patch(`/tasks/${id}/subtasks/${subtaskId}`, data),
    onMutate: async ({ subtaskId, data }) => {
      // Cancela refetches pendentes
      await queryClient.cancelQueries({ queryKey: ['task', id] });
      
      // Salva o estado anterior
      const previousSubtasks = subtasks;
      
      // Atualiza a tela imediatamente
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, ...data } : s));
      
      return { previousSubtasks };
    },
    onError: (err, variables, context) => {
      // Reverte se der erro
      if (context?.previousSubtasks) {
        setSubtasks(context.previousSubtasks);
      }
      toast.error('Erro ao atualizar subtarefa');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
    }
  });

  const handleUpdateSubtask = (subtaskId: string, data: Partial<Subtask>) => {
    updateSubtaskMutation.mutate({ subtaskId, data });
  };

  // 🆕 MUTATION: Adicionar Subtarefa
  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => apiClient.post(`/tasks/${id}/subtasks`, { title }),
    onSuccess: (response) => {
      setSubtasks(prev => [...prev, response.data]);
      setNewSubtaskTitle('');
      toast.success('Subtarefa adicionada!');
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
    onError: () => toast.error('Erro ao adicionar subtarefa')
  });

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtaskMutation.mutate(newSubtaskTitle);
  };

  // 🆕 MUTATION: Excluir Subtarefa
  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => apiClient.delete(`/tasks/${id}/subtasks/${subtaskId}`),
    onSuccess: (_, subtaskId) => {
      setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
      toast.success('Subtarefa excluída');
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
    },
    onError: () => toast.error('Erro ao excluir subtarefa')
  });

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!confirm('Excluir esta subtarefa?')) return;
    deleteSubtaskMutation.mutate(subtaskId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Tarefa não encontrada ou erro ao carregar.
        </div>
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

        {/* Seção de Subtarefas */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subtarefas ({subtasks.length})
          </h2>
          
          <div className="space-y-2 mb-4">
            {subtasks.map(subtask => {
              const isHighlighted = highlightSubtaskId === subtask.id;
              return (
                <div 
                  key={subtask.id}
                  ref={el => { subtaskRefs.current[subtask.id] = el; }}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-500 ${
                    isHighlighted 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20' 
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleUpdateSubtask(subtask.id, { completed: !subtask.completed })}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      ref={el => { subtaskInputRefs.current[subtask.id] = el; }}
                      defaultValue={subtask.title}
                      onBlur={(e) => {
                        if (e.target.value !== subtask.title) {
                          handleUpdateSubtask(subtask.id, { title: e.target.value });
                        }
                      }}
                      className={`w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 -ml-1 transition-colors ${
                        subtask.completed 
                          ? 'line-through text-gray-400 dark:text-gray-500' 
                          : 'text-gray-900 dark:text-white'
                      }`}
                    />
                    {subtask.due_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                        <ClockIcon className="w-3 h-3" />
                        Vence: {formatApiDateTime(subtask.due_date)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => subtaskInputRefs.current[subtask.id]?.focus()}
                      className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="Editar título da subtarefa"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Excluir subtarefa"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Nova subtarefa..."
              className="flex-1 border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask(e);
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

        <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            disabled={updateTaskMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            {updateTaskMutation.isPending ? 'Atualizando...' : 'Salvar Alterações'}
          </button>
          <Link
            href="/tasks"
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-white rounded hover:bg-gray-400 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function EditTaskPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <EditTaskContent />
    </Suspense>
  );
}