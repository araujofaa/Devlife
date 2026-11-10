'use client';

import { useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon, ChevronDownIcon, ChevronRightIcon, CalendarIcon, TrashIcon,
  CheckCircleIcon, ClockIcon, ListBulletIcon, XMarkIcon, CheckIcon,
  TagIcon, PencilIcon, ArrowPathIcon, SunIcon, CalendarDaysIcon,
  ExclamationTriangleIcon, ArrowRightIcon, PlusCircleIcon, ArrowUpTrayIcon,
  ViewColumnsIcon, BoltIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  formatApiDateTime, apiDateToLocalInput, localInputToApiDate,
} from '@/lib/datetime';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category { id: string; name: string; color: string; }
interface TaskCategory { category: Category; }
interface Subtask {
  id: string; title: string; completed: boolean; completed_at?: string | null;
  due_date?: string | null; order?: number; created_at: string;
}
interface Task {
  id: string; title: string; description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done';
  due_date?: string; created_at: string; updated_at: string;
  subtasks?: Subtask[]; categories?: TaskCategory[];
  recurrence_type?: string | null; recurrence_interval?: number | null; recurrence_end_date?: string | null;
}

type Tab = 'pending' | 'in_progress' | 'done' | 'all';
type QuickFilter = 'today' | 'week' | 'overdue' | null;

// 🆕 Helper para verificar atraso visual (apenas para tarefas NÃO concluídas)
function isOverdue(date?: string | null) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

// 🆕 Helper para o filtro "Atrasadas" (Inclui Concluídas Atrasadas)
function isTaskInOverdueFilter(task: Task) {
  if (!task.due_date) return false;
  const due = new Date(task.due_date).getTime();
  
  if (task.status === 'done') {
    // Tarefa concluída: checa se foi finalizada após o vencimento
    const completed = new Date(task.updated_at).getTime();
    return completed > due;
  }
  
  // Tarefa pendente/em progresso: checa se o vencimento já passou
  return Date.now() > due;
}

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
      const from = new Date(today); 
      const to = new Date(today); 
      to.setHours(23, 59, 59, 999); 
      return { from: from.toISOString(), to: to.toISOString() }; 
    }
    case 'week': { 
      const to = new Date(today); 
      const dayOfWeek = today.getDay(); 
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; 
      to.setDate(today.getDate() + daysUntilSunday); 
      to.setHours(23, 59, 59, 999); 
      return { from: today.toISOString(), to: to.toISOString() }; 
    }
    case 'overdue': { 
      return { to: now.toISOString() }; 
    }
    default: return {};
  }
}

function filterSubtasksByRange(subtasks: Subtask[], range: { from?: string; to?: string }): Subtask[] {
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

// ==========================================
// COMPONENTES DO KANBAN
// ==========================================
function KanbanCard({ task, onToggleSubtask }: { task: Task, onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void }) {
  // 🆕 Adicionado type: 'Task' para ajudar no Dnd-Kit
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task } });
  const [showSubtasks, setShowSubtasks] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const completedCount = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
  
  const showOverdueBadge = isOverdue(task.due_date) && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'ring-2 ring-blue-500 opacity-50' : ''
      } ${showOverdueBadge ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">{task.title}</h4>
        {totalSubtasks > 0 && (
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            onPointerDown={(e) => e.stopPropagation()} 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 shrink-0 ml-2"
          >
            {showSubtasks ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5 mb-2">
        {task.categories?.map((tc) => (
          <span key={tc.category.id} className="px-1.5 py-0.5 rounded text-[10px] text-white font-bold" style={{ backgroundColor: tc.category.color }}>
            {tc.category.name}
          </span>
        ))}
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        }`}>
          {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
        </span>
        {showOverdueBadge && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">Atrasada</span>}
      </div>

      {task.due_date && (
        <div className={`flex items-center gap-1 text-xs mb-2 ${showOverdueBadge ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          <CalendarIcon className="w-3 h-3" /> {formatApiDateTime(task.due_date)}
        </div>
      )}

      {totalSubtasks > 0 && !showSubtasks && (
        <div className="w-full mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${task.status === 'done' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {showSubtasks && task.subtasks && (
        <div 
          className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">
            Subtarefas ({completedCount}/{totalSubtasks})
          </div>
          {task.subtasks.map(sub => {
            const subOverdue = isOverdue(sub.due_date) && !sub.completed;
            return (
              <div key={sub.id} className="flex flex-col gap-0.5">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSubtask(task.id, sub.id, !sub.completed);
                    }}
                    className="w-3.5 h-3.5 mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <span className={`text-xs leading-tight ${sub.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {sub.title}
                  </span>
                </div>
                {sub.due_date && (
                  <div className={`ml-5 text-[10px] flex items-center gap-1 ${subOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    <CalendarIcon className="w-2.5 h-2.5" /> {formatApiDateTime(sub.due_date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ id, title, tasks, color, onToggleSubtask }: { id: string, title: string, tasks: Task[], color: string, onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void }) {
  const { setNodeRef } = useDroppable({ id, data: { type: 'Column', id } });

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800 h-[calc(100vh-250px)]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${color}`} />
          {title}
        </h3>
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onToggleSubtask={onToggleSubtask} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function TasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>((searchParams.get('quick') as QuickFilter) || null);
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('status') as Tab) || 'pending');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '', priority: searchParams.get('priority') || '',
    categoryId: searchParams.get('categoryId') || '', due_date_from: searchParams.get('due_date_from') || '',
    due_date_to: searchParams.get('due_date_to') || '', overdue: searchParams.get('overdue') === 'true',
  });
  const [page, setPage] = useState(1);
  const limit = 10;

  const [editingField, setEditingField] = useState<{ taskId: string; field: 'priority' | 'category' | 'due_date'; } | null>(null);
  const [editingSubtaskDate, setEditingSubtaskDate] = useState<{ taskId: string; subtaskId: string; title: string; currentValue: string; } | null>(null);

  const quickFilterRange = useMemo(() => getQuickFilterRange(activeQuickFilter), [activeQuickFilter]);
  const hasRange = !!(quickFilterRange.from || quickFilterRange.to);
  
  const effectiveFilters = useMemo(() => {
    return {
      ...filters,
      due_date_from: quickFilterRange.from || filters.due_date_from,
      due_date_to: quickFilterRange.to || filters.due_date_to,
    };
  }, [filters, quickFilterRange]);

  // QUERIES
  const { data: categories = [] } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: async () => (await apiClient.get('/categories')).success ? (await apiClient.get('/categories')).data : [] 
  });

  const { data: counts = { pending: 0, in_progress: 0, done: 0, total: 0 } } = useQuery({ 
    queryKey: ['tasks', 'counts'], 
    queryFn: async () => { 
      const res = await apiClient.get('/tasks/counts'); 
      return res.success ? res.data : { pending: 0, in_progress: 0, done: 0, total: 0 }; 
    } 
  });

  const { data: kanbanData, isLoading: isKanbanLoading } = useQuery({
    queryKey: ['tasks', 'kanban', effectiveFilters, activeQuickFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '1000',
        ...(effectiveFilters.search && { search: effectiveFilters.search }),
        ...(effectiveFilters.priority && { priority: effectiveFilters.priority }),
        ...(effectiveFilters.categoryId && { categoryId: effectiveFilters.categoryId }),
        ...(effectiveFilters.due_date_from && { due_date_from: effectiveFilters.due_date_from }),
        ...(effectiveFilters.due_date_to && { due_date_to: effectiveFilters.due_date_to }),
      });
      const res = await apiClient.get(`/tasks?${params.toString()}`);
      if (!res.success) throw new Error('Erro');
      
      let allTasks = res.data.tasks;
      
      if (activeQuickFilter === 'overdue') {
        allTasks = allTasks.filter((task: Task) => isTaskInOverdueFilter(task));
      }
      
      return { tasks: allTasks as Task[], total: allTasks.length };
    },
    enabled: viewMode === 'kanban',
  });

  const { data: tasksData, isLoading: isListLoading } = useQuery({
    queryKey: ['tasks', { page, activeTab, effectiveFilters, activeQuickFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
        ...(activeTab !== 'all' && { status: activeTab }),
        ...(effectiveFilters.search && { search: effectiveFilters.search }),
        ...(effectiveFilters.priority && { priority: effectiveFilters.priority }),
        ...(effectiveFilters.categoryId && { categoryId: effectiveFilters.categoryId }),
        ...(effectiveFilters.due_date_from && { due_date_from: effectiveFilters.due_date_from }),
        ...(effectiveFilters.due_date_to && { due_date_to: effectiveFilters.due_date_to }),
      });
      const res = await apiClient.get(`/tasks?${params.toString()}`);
      if (!res.success) throw new Error('Erro ao carregar tarefas');
      
      let allTasks = res.data.tasks;
      
      if (activeQuickFilter === 'overdue') {
        allTasks = allTasks.filter((task: Task) => isTaskInOverdueFilter(task));
      }
      
      return { 
        tasks: allTasks.map((t: Task) => ({ ...t, subtasks: t.subtasks ? sortSubtasks(t.subtasks) : [] })), 
        total: allTasks.length 
      };
    },
    enabled: viewMode === 'list',
  });

  const tasks = tasksData?.tasks || [];
  const total = tasksData?.total || 0;

  // MUTATIONS
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Tarefa excluída!');
    },
    onError: () => toast.error('Erro ao excluir tarefa'),
  });

  const clearCompletedMutation = useMutation({
    mutationFn: () => apiClient.delete('/tasks/clear-completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success('Tarefas concluídas removidas!');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => apiClient.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ taskId, subtaskId, completed }: { taskId: string, subtaskId: string, completed: boolean }) =>
      apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { completed }),
    onMutate: async ({ taskId, subtaskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks', { page, activeTab, effectiveFilters, activeQuickFilter }]);

      queryClient.setQueryData(['tasks', { page, activeTab, effectiveFilters, activeQuickFilter }], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t: Task) => {
            if (t.id !== taskId) return t;
            return { ...t, subtasks: t.subtasks?.map((s: Subtask) => s.id === subtaskId ? { ...s, completed } : s) };
          })
        };
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', { page, activeTab, effectiveFilters, activeQuickFilter }], context.previousTasks);
      }
      toast.error('Erro ao atualizar subtarefa');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  // HANDLERS
  const handleDelete = (id: string) => { if (confirm('Excluir esta tarefa?')) deleteTaskMutation.mutate(id); };
  
  const handleClearCompleted = () => {
    if (counts.done === 0) { toast.error('Não há tarefas concluídas para limpar'); return; }
    if (!confirm(`Excluir ${counts.done} tarefa(s) concluída(s)?`)) return;
    clearCompletedMutation.mutate();
  };

  // 🆕 ToggleStatus atualizado para 3 estados (Pendente -> Em Progresso -> Concluída)
  const handleToggleStatus = (task: Task) => {
    let newStatus: 'pending' | 'in_progress' | 'done' = 'pending';
    if (task.status === 'pending') newStatus = 'in_progress';
    else if (task.status === 'in_progress') newStatus = 'done';
    
    updateTaskMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const handleKanbanToggleSubtask = (taskId: string, subtaskId: string, completed: boolean) => {
    toggleSubtaskMutation.mutate({ taskId, subtaskId, completed });
  };

  const handleQuickFilter = (quick: QuickFilter) => { 
    const n = activeQuickFilter === quick ? null : quick; 
    setActiveQuickFilter(n); 
    setPage(1); 
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
    const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value; 
    setFilters(p => ({ ...p, [e.target.name]: v })); 
    setPage(1); 
  };

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); setPage(1); };

  const handleToggleCategory = (task: Task, categoryId: string) => {
    const currentIds = task.categories?.map((tc) => tc.category.id) || [];
    const newIds = currentIds.includes(categoryId) ? currentIds.filter((id) => id !== categoryId) : [...currentIds, categoryId];
    updateTaskMutation.mutate({ id: task.id, data: { categoryIds: newIds } });
  };

  const handleChangePriority = (taskId: string, priority: 'low' | 'medium' | 'high') => { setEditingField(null); updateTaskMutation.mutate({ id: taskId, data: { priority } }); };
  const handleChangeDueDate = (taskId: string, dateStr: string) => { const iso = dateStr ? localInputToApiDate(dateStr) : null; setEditingField(null); updateTaskMutation.mutate({ id: taskId, data: { due_date: iso } }); };

  const saveSubtaskDate = (value: string) => {
    if (!editingSubtaskDate) return;
    const { taskId, subtaskId } = editingSubtaskDate;
    const iso = value ? localInputToApiDate(value) : null;
    setEditingSubtaskDate(null);
    apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { due_date: iso }).then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
  };

  const removeSubtaskDate = () => {
    if (!editingSubtaskDate) return;
    const { taskId, subtaskId } = editingSubtaskDate;
    setEditingSubtaskDate(null);
    apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { due_date: null }).then(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }));
  };

  const toggleExpand = (taskId: string) => { setExpandedTasks(p => { const n = new Set(p); n.has(taskId) ? n.delete(taskId) : n.add(taskId); return n; }); };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) setActiveTask(task);
  };

  // 🆕 handleDragEnd corrigido para aceitar drop em cima de colunas ou de outros cards
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const task = active.data.current?.task as Task;
    if (!task) return;

    let newStatus = task.status;

    // Se soltou na coluna
    if (over.data.current?.type === 'Column') {
      newStatus = over.id as 'pending' | 'in_progress' | 'done';
    } 
    // Se soltou em cima de outro card
    else if (over.data.current?.task) {
      newStatus = (over.data.current.task as Task).status;
    }

    if (task.status !== newStatus) {
      queryClient.setQueryData(['tasks', 'kanban', effectiveFilters, activeQuickFilter], (old: any) => {
        if (!old) return old;
        return { ...old, tasks: old.tasks.map((t: Task) => t.id === taskId ? { ...t, status: newStatus } : t) };
      });
      updateTaskMutation.mutate({ id: taskId, data: { status: newStatus } });
      toast.success(`Movida para ${newStatus === 'pending' ? 'A Fazer' : newStatus === 'in_progress' ? 'Em Progresso' : 'Concluído'}!`);
    }
  };

  const kanbanTasks = kanbanData?.tasks || [];
  const columns = [
    { id: 'pending', title: 'A Fazer', color: 'bg-amber-400', tasks: kanbanTasks.filter(t => t.status === 'pending') },
    { id: 'in_progress', title: 'Em Progresso', color: 'bg-blue-500', tasks: kanbanTasks.filter(t => t.status === 'in_progress') },
    { id: 'done', title: 'Concluído', color: 'bg-green-500', tasks: kanbanTasks.filter(t => t.status === 'done') },
  ];

  const totalPages = Math.ceil(total / limit);

  const tabs = [
    { id: 'pending', label: 'Pendentes', count: counts.pending, icon: ClockIcon, color: 'text-amber-600' },
    { id: 'in_progress', label: 'Em Progresso', count: counts.in_progress || 0, icon: ArrowRightIcon, color: 'text-blue-600' },
    { id: 'done', label: 'Concluídas', count: counts.done, icon: CheckCircleIcon, color: 'text-green-600' },
    { id: 'all', label: 'Todas', count: counts.total, icon: ListBulletIcon, color: 'text-blue-600' },
  ];

  const quickFilters = [
    { id: 'today', label: 'Hoje', icon: SunIcon, color: 'text-amber-600', activeColor: 'bg-amber-500' },
    { id: 'week', label: 'Esta semana', icon: CalendarDaysIcon, color: 'text-blue-600', activeColor: 'bg-blue-600' },
    { id: 'overdue', label: 'Atrasadas', icon: ExclamationTriangleIcon, color: 'text-red-600', activeColor: 'bg-red-600' },
  ];

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Tarefas</h1>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              <ListBulletIcon className="w-4 h-4" /> Lista
            </button>
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              <ViewColumnsIcon className="w-4 h-4" /> Kanban
            </button>
          </div>

          <div className="flex gap-2">
            <Link href="/tasks/import-export" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2">
              <ArrowUpTrayIcon className="w-5 h-5" /> <span className="hidden sm:inline">Importar/Exportar</span>
            </Link>
            <Link href="/tasks/create" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" /> Nova Tarefa
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {quickFilters.map((qf) => {
          const Icon = qf.icon;
          const isActive = activeQuickFilter === qf.id;
          return (
            <button key={qf.id} onClick={() => handleQuickFilter(qf.id as QuickFilter)} className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${isActive ? `${qf.activeColor} text-white shadow-md` : 'bg-white dark:bg-gray-800 text-gray-700 border border-gray-200 hover:shadow'}`}>
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : qf.color}`} />
              <span>{qf.label}</span>
            </button>
          );
        })}

        {activeQuickFilter && (
          <button
            onClick={() => handleQuickFilter(null)}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            <XMarkIcon className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          {isKanbanLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                {columns.map((col) => (
                  <KanbanColumn 
                    key={col.id} 
                    id={col.id} 
                    title={col.title} 
                    color={col.color} 
                    tasks={col.tasks} 
                    onToggleSubtask={handleKanbanToggleSubtask}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeTask ? <KanbanCard task={activeTask} onToggleSubtask={handleKanbanToggleSubtask} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id as Tab)} className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? tab.color : ''}`} />
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'done' && counts.done > 0 && (
            <div className="mb-4 flex justify-end">
              <button onClick={handleClearCompleted} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200">
                <TrashIcon className="w-4 h-4" /> Limpar todas as concluídas
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <input type="text" name="search" placeholder="Buscar..." value={filters.search} onChange={handleFilterChange} className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <select name="priority" value={filters.priority} onChange={handleFilterChange} className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Prioridade</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Todas as categorias</option>
              {categories.map((cat: Category) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input type="date" name="due_date_from" value={filters.due_date_from} onChange={handleFilterChange} className="border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <div className="flex items-center gap-2">
              <label htmlFor="overdue" className="text-sm font-medium text-gray-700 dark:text-gray-300">Atrasadas</label>
              <input type="checkbox" id="overdue" name="overdue" checked={filters.overdue} onChange={handleFilterChange} className="w-4 h-4" />
            </div>
          </div>

          {isListLoading && !tasksData ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <ListBulletIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhuma tarefa encontrada.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {tasks.map((task: Task) => {
                  const completedCount = task.subtasks?.filter((s) => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const progress = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
                  const isExpanded = expandedTasks.has(task.id);
                  const isDone = task.status === 'done';
                  const isInProgress = task.status === 'in_progress';
                  
                  const taskIsOverdue = isOverdue(task.due_date) && !isDone;

                  const visibleSubtasks = hasRange && task.subtasks ? filterSubtasksByRange(task.subtasks, quickFilterRange) : task.subtasks || [];
                  const hiddenCount = hasRange && task.subtasks ? task.subtasks.length - visibleSubtasks.length : 0;

                  return (
                    <div key={task.id} className={`rounded-lg shadow overflow-hidden transition-all ${
                      isDone 
                        ? 'bg-gray-50 border-l-4 border-green-500 opacity-75 dark:bg-gray-900/40' 
                        : taskIsOverdue 
                          ? 'bg-red-50 border-l-4 border-red-500 dark:bg-red-900/10' 
                          : isInProgress
                            ? 'bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/10'
                            : 'bg-white dark:bg-gray-800'
                    }`}>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => toggleExpand(task.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                              </button>
                              <h3 className={`font-bold ${isDone ? 'line-through text-gray-500' : taskIsOverdue ? 'text-red-900 dark:text-red-200' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                              {isDone && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                              {isInProgress && <BoltIcon className="w-5 h-5 text-blue-500" />}
                              {totalSubtasks > 0 && <span className="text-xs text-gray-500">({completedCount}/{totalSubtasks})</span>}
                              {taskIsOverdue && <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold animate-pulse">⚠️ ATRASADA</span>}
                            </div>

                            {task.description && <p className={`ml-7 mt-1 ${isDone ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-300'}`}>{task.description}</p>}

                            <div className="flex flex-wrap items-center gap-2 mt-2 ml-7">
                              <div className="flex items-center gap-1 group/cat">
                                {task.categories?.map((tc) => (
                                  <button key={tc.category.id} onClick={() => setEditingField({ taskId: task.id, field: 'category' })} className={`px-2 py-1 rounded-full text-xs text-white font-medium ${isDone ? 'opacity-60' : ''}`} style={{ backgroundColor: tc.category.color }}>
                                    {tc.category.name}
                                  </button>
                                ))}
                                <button onClick={() => setEditingField({ taskId: task.id, field: 'category' })} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-blue-100 hover:text-blue-700">
                                  <TagIcon className="w-3 h-3" />
                                </button>
                              </div>

                              <button onClick={() => setEditingField({ taskId: task.id, field: 'priority' })} className={`px-2 py-1 rounded text-xs font-semibold ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {task.priority === 'high' ? '🔴 Alta' : task.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                              </button>

                              {/* 🆕 Botão de status agora mostra os 3 estados e alterna */}
                              <button onClick={() => handleToggleStatus(task)} className={`px-2 py-1 rounded text-xs font-semibold ${
                                isDone ? 'bg-green-100 text-green-700' :
                                isInProgress ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {isDone ? '✅ Concluída' : isInProgress ? '⚡ Em Progresso' : '⏳ Pendente'}
                              </button>

                              {task.recurrence_type && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                                  <ArrowPathIcon className="w-3.5 h-3.5" /> {task.recurrence_type === 'daily' ? 'Diária' : task.recurrence_type === 'weekly' ? 'Semanal' : task.recurrence_type === 'monthly' ? 'Mensal' : 'Anual'}
                                </span>
                              )}

                              <button onClick={() => setEditingField({ taskId: task.id, field: 'due_date' })} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${task.due_date ? (taskIsOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200') : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                <CalendarIcon className="w-3.5 h-3.5" /> {task.due_date ? formatApiDateTime(task.due_date) : 'Sem data'}
                              </button>
                            </div>

                            {totalSubtasks > 0 && (
                              <div className="w-full mt-3 ml-7 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div className={`h-full ${isDone ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{progress}%</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Link href={`/tasks/${task.id}/edit`} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 text-sm text-gray-800 dark:text-white flex items-center gap-1">
                              <PencilIcon className="w-4 h-4" /> Editar
                            </Link>
                            <button onClick={() => handleDelete(task.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
                          {hasRange && hiddenCount > 0 && <div className="mb-3 text-xs text-gray-500">Mostrando {visibleSubtasks.length} de {task.subtasks.length} subtarefas no período.</div>}
                          {visibleSubtasks.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Nenhuma subtarefa dentro do período.</p>
                          ) : (
                            <ul className="space-y-2">
                              {visibleSubtasks.map((subtask) => {
                                const subOverdue = isOverdue(subtask.due_date) && !subtask.completed;
                                return (
                                  <li key={subtask.id} className="flex items-start gap-2 group">
                                    <input type="checkbox" checked={subtask.completed} onChange={() => handleKanbanToggleSubtask(task.id, subtask.id, !subtask.completed)} className="w-4 h-4 rounded mt-0.5 cursor-pointer" />
                                    <div className="flex-1 min-w-0">
                                      <Link href={`/tasks/${task.id}/edit?subtask=${subtask.id}`} className={`block text-sm hover:underline ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {subtask.title}
                                      </Link>
                                      <div className="flex flex-wrap gap-2 mt-0.5 items-center">
                                        {subtask.due_date ? (
                                          <button onClick={() => setEditingSubtaskDate({ taskId: task.id, subtaskId: subtask.id, title: subtask.title, currentValue: apiDateToLocalInput(subtask.due_date!) })} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${subOverdue ? 'text-red-600 bg-red-50 font-semibold' : 'text-blue-600 bg-blue-50'}`}>
                                            <CalendarIcon className="w-3 h-3" /> {subOverdue ? 'Atrasada: ' : 'Vence: '} {formatApiDateTime(subtask.due_date)}
                                          </button>
                                        ) : (
                                          <button onClick={() => setEditingSubtaskDate({ taskId: task.id, subtaskId: subtask.id, title: subtask.title, currentValue: '' })} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">
                                            <PlusCircleIcon className="w-3 h-3" /> Adicionar data
                                          </button>
                                        )}
                                        {subtask.completed && subtask.completed_at && (
                                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircleIcon className="w-3 h-3" /> Concluída em {formatApiDateTime(subtask.completed_at)}</span>
                                        )}
                                        <Link href={`/tasks/${task.id}/edit?subtask=${subtask.id}`} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">
                                          <PencilIcon className="w-3 h-3" /> Editar
                                        </Link>
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
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded disabled:opacity-50 bg-white dark:bg-gray-800">Anterior</button>
                  <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded border">Página {page} de {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded disabled:opacity-50 bg-white dark:bg-gray-800">Próxima</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingField(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const task = tasks.find((t: Task) => t.id === editingField.taskId) || kanbanData?.tasks.find((t: Task) => t.id === editingField.taskId);
              if (!task) return null;

              if (editingField.field === 'priority') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Alterar prioridade</h3>
                    <div className="space-y-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button key={p} onClick={() => handleChangePriority(task.id, p)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${task.priority === p ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}>
                          <span className="text-2xl">{p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'}</span>
                          <span className="font-medium">{p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}</span>
                          {task.priority === p && <CheckIcon className="w-5 h-5 text-blue-600 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </>
                );
              }

              if (editingField.field === 'category') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Categorias</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {categories.map((cat: Category) => {
                        const isSelected = task.categories?.some((tc: TaskCategory) => tc.category.id === cat.id) || false;
                        return (
                          <button key={cat.id} onClick={() => handleToggleCategory(task, cat.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-medium">{cat.name}</span>
                            {isSelected && <CheckIcon className="w-5 h-5 text-blue-600 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setEditingField(null)} className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Concluir</button>
                  </>
                );
              }

              if (editingField.field === 'due_date') {
                return (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Data de vencimento</h3>
                    <input type="datetime-local" defaultValue={task.due_date ? apiDateToLocalInput(task.due_date) : ''} id="date-editor" className="w-full border px-3 py-2 rounded-lg" autoFocus />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => { const input = document.getElementById('date-editor') as HTMLInputElement; handleChangeDueDate(task.id, input.value); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Salvar</button>
                      <button onClick={() => handleChangeDueDate(task.id, '')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">Remover</button>
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {editingSubtaskDate && (() => {
        const parentTask = tasks.find((t: Task) => t.id === editingSubtaskDate.taskId) || kanbanData?.tasks.find((t: Task) => t.id === editingSubtaskDate.taskId);
        const minDate = parentTask?.start_date ? apiDateToLocalInput(parentTask.start_date) : undefined;
        const maxDate = parentTask?.due_date ? apiDateToLocalInput(parentTask.due_date) : undefined;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setEditingSubtaskDate(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-2">Data da subtarefa</h3>
              <p className="text-sm text-gray-500 mb-4 truncate">{editingSubtaskDate.title}</p>
              
              <input 
                type="datetime-local" 
                defaultValue={editingSubtaskDate.currentValue} 
                id="subtask-date-editor" 
                className="w-full border px-3 py-2 rounded-lg" 
                autoFocus 
                min={minDate}
                max={maxDate}
              />
              
              {(minDate || maxDate) && (
                <p className="text-xs text-gray-500 mt-2">
                  A data deve estar entre {minDate ? formatApiDateTime(parentTask?.start_date!) : 'início'} e {maxDate ? formatApiDateTime(parentTask?.due_date!) : 'fim'}.
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => { const input = document.getElementById('subtask-date-editor') as HTMLInputElement; saveSubtaskDate(input.value); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2">
                  <CheckIcon className="w-4 h-4" /> Salvar
                </button>
                {editingSubtaskDate.currentValue && (
                  <button onClick={removeSubtaskDate} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-1"><TrashIcon className="w-4 h-4" /> Remover</button>
                )}
                <button onClick={() => setEditingSubtaskDate(null)} className="px-4 py-2 bg-gray-100 rounded-lg"><XMarkIcon className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <TasksContent />
    </Suspense>
  );
}