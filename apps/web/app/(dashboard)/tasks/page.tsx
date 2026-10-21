'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ListBulletIcon,
  XMarkIcon,
  CheckIcon,
  TagIcon,
  PencilIcon,
  ArrowPathIcon,
  SunIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  formatApiDateTime,
  formatApiTime,
  apiDateToLocalInput,
  localInputToApiDate,
} from '@/lib/datetime';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TaskCategory {
  category: Category;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  due_date?: string | null;
  order?: number;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
  categories?: TaskCategory[];
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
}

type Tab = 'pending' | 'done' | 'all';
type QuickFilter = 'today' | 'week' | 'upcoming' | 'overdue' | null;

function sortSubtasks(subtasks: Subtask[]): Subtask[] {
  return [...subtasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return (a.order ?? 0) - (b.order ?? 0);
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    const aTime = new Date(a.due_date).getTime();
    const bTime = new Date(b.due_date).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function getQuickFilterRange(quick: QuickFilter): { from?: string; to?: string } {
  if (!quick) return {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (quick) {
    case 'today': {
      const to = new Date(today);
      to.setHours(23, 59, 59, 999);
      return { from: today.toISOString(), to: to.toISOString() };
    }
    case 'week': {
      const to = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      to.setDate(today.getDate() + daysUntilSunday);
      to.setHours(23, 59, 59, 999);
      return { from: today.toISOString(), to: to.toISOString() };
    }
    case 'upcoming': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: tomorrow.toISOString() };
    }
    case 'overdue': {
      const yesterday = new Date(today);
      yesterday.setMilliseconds(-1);
      return { to: yesterday.toISOString() };
    }
    default:
      return {};
  }
}

function filterSubtasksByRange(
  subtasks: Subtask[],
  range: { from?: string; to?: string }
): Subtask[] {
  if (!range.from && !range.to) return subtasks;

  const fromDate = range.from ? new Date(range.from) : null;
  const toDate = range.to ? new Date(range.to) : null;

  return subtasks.filter((s) => {
    if (!s.due_date) return false;
    const d = new Date(s.due_date);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });
}

function TasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);

  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>(
    (searchParams.get('quick') as QuickFilter) || null
  );

  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('status') as Tab) || 'pending'
  );
  const [counts, setCounts] = useState({ pending: 0, done: 0, total: 0 });
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    priority: searchParams.get('priority') || '',
    categoryId: searchParams.get('categoryId') || '',
    due_date_from: searchParams.get('due_date_from') || '',
    due_date_to: searchParams.get('due_date_to') || '',
    overdue: searchParams.get('overdue') === 'true',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [editingField, setEditingField] = useState<{
    taskId: string;
    field: 'priority' | 'category' | 'due_date';
  } | null>(null);

  // 🆕 Estado para editar a data da subtarefa
  const [editingSubtaskDate, setEditingSubtaskDate] = useState<{
    taskId: string;
    subtaskId: string;
    title: string;
    currentValue: string; // valor inicial do input
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  const quickFilterRange = useMemo(
    () => getQuickFilterRange(activeQuickFilter),
    [activeQuickFilter]
  );
  const hasRange = !!(quickFilterRange.from || quickFilterRange.to);

  const effectiveFilters = useMemo(() => {
    return {
      ...filters,
      due_date_from: quickFilterRange.from || filters.due_date_from,
      due_date_to: quickFilterRange.to || filters.due_date_to,
    };
  }, [filters, quickFilterRange]);

  const isOverdue = (task: Task): boolean => {
    if (!task.due_date || task.status === 'done') return false;
    const today = new Date();
    const dueDate = new Date(task.due_date);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return dueDateOnly < todayDate;
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      if (response.success) setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await apiClient.get('/tasks/counts');
      if (response.success) setCounts(response.data);
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(activeTab !== 'all' && { status: activeTab }),
        ...(effectiveFilters.search && { search: effectiveFilters.search }),
        ...(effectiveFilters.priority && { priority: effectiveFilters.priority }),
        ...(effectiveFilters.categoryId && { categoryId: effectiveFilters.categoryId }),
        ...(effectiveFilters.due_date_from && { due_date_from: effectiveFilters.due_date_from }),
        ...(effectiveFilters.due_date_to && { due_date_to: effectiveFilters.due_date_to }),
      });

      const response = await apiClient.get(`/tasks?${params.toString()}`);
      if (response.success) {
        let allTasks = response.data.tasks;
        if (effectiveFilters.overdue) allTasks = allTasks.filter(isOverdue);
        allTasks = allTasks.map((task: Task) => ({
          ...task,
          subtasks: task.subtasks ? sortSubtasks(task.subtasks) : [],
        }));
        setTasks(allTasks);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchCounts(); }, []);
  useEffect(() => { fetchTasks(); }, [page, effectiveFilters, activeTab]);

  // Fecha popovers ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setEditingField(null);
        setEditingSubtaskDate(null);
      }
    };
    if (editingField || editingSubtaskDate) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editingField, editingSubtaskDate]);

  const handleQuickFilter = (quick: QuickFilter) => {
    const newQuick = activeQuickFilter === quick ? null : quick;
    setActiveQuickFilter(newQuick);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newQuick) params.set('quick', newQuick);
    else params.delete('quick');
    router.replace(`/tasks?${params.toString()}`, { scroll: false });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox'
      ? (target as HTMLInputElement).checked
      : target.value;
    setFilters((prev) => ({ ...prev, [target.name]: value }));
    setPage(1);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      const response = await apiClient.delete(`/tasks/${id}`);
      if (response.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        fetchCounts();
        toast.success('Tarefa excluída!');
      }
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleClearCompleted = async () => {
    if (counts.done === 0) {
      toast.error('Não há tarefas concluídas para limpar');
      return;
    }
    if (!confirm(`Excluir ${counts.done} tarefa(s) concluída(s)?`)) return;
    try {
      const response = await apiClient.delete('/tasks/clear-completed');
      if (response.success) {
        toast.success(response.message || 'Tarefas concluídas removidas!');
        fetchTasks();
        fetchCounts();
      }
    } catch (error) {
      toast.error('Erro ao limpar tarefas concluídas');
    }
  };

  const updateTask = async (taskId: string, data: Partial<Task> & { categoryIds?: string[] }) => {
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, data);
      if (response.success) {
        const updatedTask = {
          ...response.data,
          subtasks: response.data.subtasks ? sortSubtasks(response.data.subtasks) : [],
        };
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        fetchCounts();
        if (data.status && activeTab !== 'all' && data.status !== activeTab) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
        }
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Erro ao atualizar');
      return false;
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    const success = await updateTask(task.id, { status: newStatus });
    if (success) {
      if (newStatus === 'done' && task.recurrence_type) {
        toast.success('Tarefa concluída! 🔁 Próxima ocorrência criada.');
        fetchTasks();
        fetchCounts();
      } else {
        toast.success(newStatus === 'done' ? 'Tarefa concluída! ✅' : 'Tarefa reaberta');
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleChangePriority = async (taskId: string, priority: 'low' | 'medium' | 'high') => {
    setEditingField(null);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
    const success = await updateTask(taskId, { priority });
    if (success) toast.success('Prioridade atualizada!');
  };

  const handleToggleCategory = async (task: Task, categoryId: string) => {
    const currentIds = task.categories?.map((tc) => tc.category.id) || [];
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter((id) => id !== categoryId)
      : [...currentIds, categoryId];
    const newCategories = newIds
      .map((id) => {
        const cat = categories.find((c) => c.id === id);
        return cat ? { category: cat } : null;
      })
      .filter(Boolean) as TaskCategory[];
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, categories: newCategories } : t))
    );
    try {
      const response = await apiClient.patch(`/tasks/${task.id}`, { categoryIds: newIds });
      if (response.success) {
        const updatedTask = {
          ...response.data,
          subtasks: response.data.subtasks ? sortSubtasks(response.data.subtasks) : [],
        };
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
      }
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
    }
  };

  const handleChangeDueDate = async (taskId: string, dueDate: string) => {
    const iso = dueDate ? localInputToApiDate(dueDate) : null;
    setEditingField(null);
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, { due_date: iso });
      if (response.success) {
        const updatedTask = {
          ...response.data,
          subtasks: response.data.subtasks ? sortSubtasks(response.data.subtasks) : [],
        };
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        toast.success('Data atualizada!');
      }
    } catch (error) {
      toast.error('Erro ao atualizar data');
    }
  };

  const toggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks?.map((s) =>
                s.id === subtaskId
                  ? { ...s, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
                  : s
              ),
            }
          : task
      )
    );
    try {
      const response = await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        completed: !completed,
      });
      if (response.success) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: sortSubtasks(
                    task.subtasks?.map((s) => (s.id === subtaskId ? response.data : s)) || []
                  ),
                }
              : task
          )
        );
        toast.success(!completed ? 'Subtarefa concluída! ✅' : 'Subtarefa reaberta');
      }
    } catch (error) {
      console.error('Erro ao atualizar subtarefa', error);
    }
  };

  // 🆕 Abre o modal de edição de data da subtarefa
  const openSubtaskDateEditor = (taskId: string, subtask: Subtask) => {
    setEditingSubtaskDate({
      taskId,
      subtaskId: subtask.id,
      title: subtask.title,
      currentValue: subtask.due_date ? apiDateToLocalInput(subtask.due_date) : '',
    });
  };

  // 🆕 Salva a nova data da subtarefa
  const saveSubtaskDate = async (value: string) => {
    if (!editingSubtaskDate) return;
    const { taskId, subtaskId } = editingSubtaskDate;
    const iso = value ? localInputToApiDate(value) : null;
    setEditingSubtaskDate(null);

    try {
      const response = await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        due_date: iso,
      });
      if (response.success) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: sortSubtasks(
                    task.subtasks?.map((s) =>
                      s.id === subtaskId ? response.data : s
                    ) || []
                  ),
                }
              : task
          )
        );
        toast.success(iso ? 'Data da subtarefa atualizada!' : 'Data removida');
      }
    } catch (error) {
      toast.error('Erro ao atualizar data da subtarefa');
    }
  };

  // 🆕 Remove a data da subtarefa
  const removeSubtaskDate = async () => {
    if (!editingSubtaskDate) return;
    const { taskId, subtaskId } = editingSubtaskDate;
    setEditingSubtaskDate(null);

    try {
      const response = await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, {
        due_date: null,
      });
      if (response.success) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: sortSubtasks(
                    task.subtasks?.map((s) =>
                      s.id === subtaskId ? response.data : s
                    ) || []
                  ),
                }
              : task
          )
        );
        toast.success('Data removida');
      }
    } catch (error) {
      toast.error('Erro ao remover data');
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  const getRecurrenceLabel = (task: Task): string => {
    if (!task.recurrence_type) return '';
    const type = task.recurrence_type === 'daily' ? 'Diária'
      : task.recurrence_type === 'weekly' ? 'Semanal'
      : task.recurrence_type === 'monthly' ? 'Mensal' : 'Anual';
    const interval = task.recurrence_interval || 1;
    return interval > 1 ? `${type} (a cada ${interval})` : type;
  };

  const totalPages = Math.ceil(total / limit);

  const tabs: { id: Tab; label: string; count: number; icon: any; color: string }[] = [
    { id: 'pending', label: 'Pendentes', count: counts.pending, icon: ClockIcon, color: 'text-amber-600' },
    { id: 'done', label: 'Concluídas', count: counts.done, icon: CheckCircleIcon, color: 'text-green-600' },
    { id: 'all', label: 'Todas', count: counts.total, icon: ListBulletIcon, color: 'text-blue-600' },
  ];

  const quickFilters: { id: QuickFilter; label: string; icon: any; color: string; activeColor: string }[] = [
    { id: 'today', label: 'Hoje', icon: SunIcon, color: 'text-amber-600', activeColor: 'bg-amber-500' },
    { id: 'week', label: 'Esta semana', icon: CalendarDaysIcon, color: 'text-blue-600', activeColor: 'bg-blue-600' },
    { id: 'upcoming', label: 'Próximas', icon: ArrowRightIcon, color: 'text-purple-600', activeColor: 'bg-purple-600' },
    { id: 'overdue', label: 'Atrasadas', icon: ExclamationTriangleIcon, color: 'text-red-600', activeColor: 'bg-red-600' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Tarefas</h1>
  <div className="flex gap-2">
    <Link
      href="/tasks/import-export"
      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
      title="Importar/Exportar tarefas"
    >
      <ArrowUpTrayIcon className="w-5 h-5" />
      Importar/Exportar
    </Link>
    <Link
      href="/tasks/create"
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
    >
      <PlusIcon className="w-5 h-5" />
      Nova Tarefa
    </Link>
  </div>
</div>

      {/* Abas */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? tab.color : ''}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((qf) => {
            const Icon = qf.icon;
            const isActive = activeQuickFilter === qf.id;
            return (
              <button
                key={qf.id}
                onClick={() => handleQuickFilter(qf.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  isActive
                    ? `${qf.activeColor} text-white shadow-md`
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : qf.color}`} />
                <span>{qf.label}</span>
              </button>
            );
          })}

          {activeQuickFilter && (
            <button
              onClick={() => handleQuickFilter(null)}
              className="flex items-center gap-1 px-3 py-2 rounded-full text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>

        {activeQuickFilter && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Mostrando tarefas{' '}
            <strong className="text-gray-700 dark:text-gray-200">
              {quickFilters.find((q) => q.id === activeQuickFilter)?.label.toLowerCase()}
            </strong>{' '}
            (tarefas ou subtarefas dentro do período)
          </p>
        )}
      </div>

      {activeTab === 'done' && counts.done > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleClearCompleted}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Limpar todas as concluídas
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <input
          type="text"
          name="search"
          placeholder="Buscar..."
          value={filters.search}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <select
          name="priority"
          value={filters.priority}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Prioridade</option>
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
        </select>
        <select
          name="categoryId"
          value={filters.categoryId}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="date"
          name="due_date_from"
          value={filters.due_date_from}
          onChange={handleFilterChange}
          className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="overdue" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Atrasadas
          </label>
          <input
            type="checkbox"
            id="overdue"
            name="overdue"
            checked={filters.overdue}
            onChange={handleFilterChange}
            className="w-4 h-4"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <ListBulletIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {activeQuickFilter === 'today' && 'Nenhuma tarefa para hoje. 🎉'}
            {activeQuickFilter === 'week' && 'Nenhuma tarefa esta semana.'}
            {activeQuickFilter === 'upcoming' && 'Nenhuma tarefa próxima.'}
            {activeQuickFilter === 'overdue' && 'Nenhuma tarefa atrasada. 🎉'}
            {!activeQuickFilter && activeTab === 'pending' && 'Nenhuma tarefa pendente.'}
            {!activeQuickFilter && activeTab === 'done' && 'Nenhuma tarefa concluída.'}
            {!activeQuickFilter && activeTab === 'all' && 'Nenhuma tarefa encontrada.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tasks.map((task) => {
              const overdue = isOverdue(task);
              const completedCount = task.subtasks?.filter((s) => s.completed).length || 0;
              const totalSubtasks = task.subtasks?.length || 0;
              const progress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
              const isExpanded = expandedTasks.has(task.id);
              const isDone = task.status === 'done';

              const visibleSubtasks = hasRange && task.subtasks
                ? filterSubtasksByRange(task.subtasks, quickFilterRange)
                : task.subtasks || [];
              const hiddenCount = hasRange && task.subtasks
                ? task.subtasks.length - visibleSubtasks.length
                : 0;

              return (
                <div
                  key={task.id}
                  className={`rounded-lg shadow overflow-hidden transition-all ${
                    isDone
                      ? 'bg-gray-50 dark:bg-gray-900/40 border-l-4 border-green-500 opacity-75'
                      : overdue
                      ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
                      : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => toggleExpand(task.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          <h3
                            className={`font-bold ${
                              isDone
                                ? 'line-through text-gray-500 dark:text-gray-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </h3>
                          {isDone && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                          {totalSubtasks > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({completedCount}/{totalSubtasks})
                            </span>
                          )}
                          {hasRange && !task.due_date && totalSubtasks > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                              📎 tem subtarefa no período
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p
                            className={`ml-7 mt-1 ${
                              isDone
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2 ml-7">
                          <div className="flex items-center gap-1 group/cat">
                            {task.categories?.map((tc) => (
                              <button
                                key={tc.category.id}
                                onClick={() => setEditingField({ taskId: task.id, field: 'category' })}
                                className={`px-2 py-1 rounded-full text-xs text-white font-medium hover:opacity-80 transition ${
                                  isDone ? 'opacity-60' : ''
                                }`}
                                style={{ backgroundColor: tc.category.color }}
                              >
                                {tc.category.name}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditingField({ taskId: task.id, field: 'category' })}
                              className={`px-2 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 ${
                                task.categories && task.categories.length > 0
                                  ? 'opacity-0 group-hover/cat:opacity-100'
                                  : 'opacity-100'
                              }`}
                            >
                              <TagIcon className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => setEditingField({ taskId: task.id, field: 'priority' })}
                            className={`px-2 py-1 rounded text-xs font-semibold hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                : task.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            } ${isDone ? 'opacity-60' : ''}`}
                          >
                            {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                          </button>

                          <button
                            onClick={() => handleToggleStatus(task)}
                            className={`px-2 py-1 rounded text-xs font-semibold hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition ${
                              isDone
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {isDone ? '✅ Concluída' : '⏳ Pendente'}
                          </button>

                          {task.recurrence_type && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${
                                isDone
                                  ? 'bg-purple-50 text-purple-500 border-purple-200 opacity-60 dark:bg-purple-900/20 dark:border-purple-800'
                                  : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                              }`}
                              title={getRecurrenceLabel(task)}
                            >
                              <ArrowPathIcon className="w-3.5 h-3.5" />
                              {task.recurrence_type === 'daily' && 'Diária'}
                              {task.recurrence_type === 'weekly' && 'Semanal'}
                              {task.recurrence_type === 'monthly' && 'Mensal'}
                              {task.recurrence_type === 'yearly' && 'Anual'}
                            </span>
                          )}

                          <button
                            onClick={() => setEditingField({ taskId: task.id, field: 'due_date' })}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition ${
                              isDone
                                ? 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                : overdue
                                ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                                : task.due_date
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                            }`}
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {task.due_date ? formatApiDateTime(task.due_date) : 'Sem data'}
                          </button>

                          {overdue && !isDone && (
                            <span className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold animate-pulse">
                              ⚠️ ATRASADA
                            </span>
                          )}
                        </div>

                        {totalSubtasks > 0 && (
                          <div className="w-full mt-3 ml-7">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isDone ? 'bg-green-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {progress}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Link
                          href={`/tasks/${task.id}/edit`}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-white flex items-center gap-1"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtarefas expandidas */}
                  {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
                      {hasRange && hiddenCount > 0 && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                          <span>
                            Mostrando{' '}
                            <strong className="text-gray-700 dark:text-gray-200">
                              {visibleSubtasks.length}
                            </strong>{' '}
                            de{' '}
                            <strong className="text-gray-700 dark:text-gray-200">
                              {task.subtasks.length}
                            </strong>{' '}
                            subtarefas —{' '}
                            <span className="text-gray-400">
                              {hiddenCount} fora do período
                            </span>
                          </span>
                        </div>
                      )}

                      {visibleSubtasks.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Nenhuma subtarefa dentro do período selecionado.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {visibleSubtasks.map((subtask) => {
                            const isSubtaskOverdue =
                              subtask.due_date &&
                              !subtask.completed &&
                              new Date(subtask.due_date) < new Date();
                            return (
                              <li key={subtask.id} className="flex items-start gap-2 group">
                                <input
                                  type="checkbox"
                                  checked={subtask.completed}
                                  onChange={() => toggleSubtask(task.id, subtask.id, subtask.completed)}
                                  className="w-4 h-4 rounded mt-0.5 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`block text-sm ${
                                      subtask.completed
                                        ? 'line-through text-gray-400 dark:text-gray-500'
                                        : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {subtask.title}
                                  </span>
                                  <div className="flex flex-wrap gap-2 mt-0.5 items-center">
                                    {/* 🆕 Data da subtarefa — CLICÁVEL para editar */}
                                    {subtask.due_date ? (
                                      <button
                                        onClick={() => openSubtaskDateEditor(task.id, subtask)}
                                        className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition ${
                                          isSubtaskOverdue
                                            ? 'text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-900/20'
                                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        }`}
                                        title="Clique para alterar data e hora"
                                      >
                                        <CalendarIcon className="w-3 h-3" />
                                        {isSubtaskOverdue ? 'Atrasada: ' : 'Vence: '}
                                        {formatApiDateTime(subtask.due_date)}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openSubtaskDateEditor(task.id, subtask)}
                                        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition opacity-0 group-hover:opacity-100"
                                        title="Adicionar data e hora"
                                      >
                                        <PlusCircleIcon className="w-3 h-3" />
                                        Adicionar data
                                      </button>
                                    )}
                                    {subtask.completed && subtask.completed_at && (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                        <CheckCircleIcon className="w-3 h-3" />
                                        Concluída em {formatApiDateTime(subtask.completed_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 dark:border-gray-700 dark:text-white"
              >
                Anterior
              </button>
              <span className="px-4 py-2 dark:text-white">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50 dark:border-gray-700 dark:text-white"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Popover: prioridade / categoria / data da tarefa */}
      {editingField && (
        <div
          ref={popoverRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setEditingField(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const task = tasks.find((t) => t.id === editingField.taskId);
              if (!task) return null;

              if (editingField.field === 'priority') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Alterar prioridade
                    </h3>
                    <div className="space-y-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleChangePriority(task.id, p)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                            task.priority === p
                              ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="text-2xl">
                            {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          {task.priority === p && (
                            <CheckIcon className="w-5 h-5 text-blue-600 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                );
              }

              if (editingField.field === 'category') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Categorias
                    </h3>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-4">
                        Nenhuma categoria criada.{' '}
                        <Link
                          href="/categories"
                          className="text-blue-600 hover:underline"
                          onClick={() => setEditingField(null)}
                        >
                          Criar categoria
                        </Link>
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categories.map((cat) => {
                          const isSelected =
                            task.categories?.some((tc) => tc.category.id === cat.id) || false;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => handleToggleCategory(task, cat.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/30'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {cat.name}
                              </span>
                              {isSelected && (
                                <CheckIcon className="w-5 h-5 text-blue-600 ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => setEditingField(null)}
                      className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Concluir
                    </button>
                  </>
                );
              }

              if (editingField.field === 'due_date') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      Data de vencimento
                    </h3>
                    <input
                      type="datetime-local"
                      defaultValue={task.due_date ? apiDateToLocalInput(task.due_date) : ''}
                      id="date-editor"
                      className="w-full border px-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          const input = document.getElementById('date-editor') as HTMLInputElement;
                          handleChangeDueDate(task.id, input.value);
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => handleChangeDueDate(task.id, '')}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                      >
                        Remover
                      </button>
                    </div>
                  </>
                );
              }

              return null;
            })()}
          </div>
        </div>
      )}

      {/* 🆕 Popover: data da SUBTAREFA */}
      {editingSubtaskDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setEditingSubtaskDate(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Data da subtarefa
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
              {editingSubtaskDate.title}
            </p>

            <input
              type="datetime-local"
              defaultValue={editingSubtaskDate.currentValue}
              id="subtask-date-editor"
              className="w-full border px-3 py-2 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const input = document.getElementById('subtask-date-editor') as HTMLInputElement;
                  saveSubtaskDate(input.value);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                Salvar
              </button>
              {editingSubtaskDate.currentValue && (
                <button
                  onClick={removeSubtaskDate}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Remover
                </button>
              )}
              <button
                onClick={() => setEditingSubtaskDate(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}