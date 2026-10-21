'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@devlife/api-client';
import CategorySelector from '@/components/CategorySelector';
import RecurrenceSelector from '@/components/RecurrenceSelector';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  Bars3Icon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatApiDateTime } from '@/lib/datetime';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string | null;
  due_date?: string | null;
  order: number;
  created_at: string;
}

// 🆕 Função de ordenação — por data (mais próxima primeiro), sem data no final
function sortSubtasks(subtasks: Subtask[]): Subtask[] {
  return [...subtasks].sort((a, b) => {
    // 1. Sem data vai para o final
    if (!a.due_date && !b.due_date) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;

    // 2. Ordena por data (mais próxima primeiro)
    const dateDiff =
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (dateDiff !== 0) return dateDiff;

    // 3. Empate: usa order
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function SortableSubtask({
  subtask,
  onToggle,
  onDelete,
  onEdit,
  editingId,
  editingTitle,
  setEditingTitle,
  onSaveEdit,
  onCancelEdit,
  inputRef,
}: {
  subtask: Subtask;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  editingId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEditing = editingId === subtask.id;
  const isSubtaskOverdue =
    subtask.due_date && !subtask.completed && new Date(subtask.due_date) < new Date();

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded group ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5"
      >
        <Bars3Icon className="w-4 h-4" />
      </button>

      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={onToggle}
        className="w-4 h-4 mt-0.5"
      />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveEdit();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            className="flex-1 border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Título"
          />
          <button type="button" onClick={onSaveEdit} className="text-green-600 hover:text-green-800">
            <CheckIcon className="w-4 h-4" />
          </button>
          <button type="button" onClick={onCancelEdit} className="text-red-600 hover:text-red-800">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <span
              className={`block ${
                subtask.completed
                  ? 'line-through text-gray-500 dark:text-gray-500'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {subtask.title}
            </span>

            <div className="flex flex-wrap gap-2 mt-0.5">
              {subtask.due_date && (
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    isSubtaskOverdue
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {isSubtaskOverdue ? 'Atrasada: ' : 'Vence: '}
                  {new Date(subtask.due_date).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {subtask.completed && subtask.completed_at && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CalendarIcon className="w-3 h-3" />
                  Concluída em{' '}
                  {new Date(subtask.completed_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" onClick={onEdit} className="text-blue-500 hover:text-blue-700">
              <PencilIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-700">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </motion.li>
  );
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
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
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 🆕 Subtarefas já ordenadas (memoizado)
  const sortedSubtasks = useMemo(() => sortSubtasks(subtasks), [subtasks]);

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
            due_date: task.due_date ? task.due_date.slice(0, 16) : '',
          });
          setCategoryIds(task.categories?.map((tc: any) => tc.category.id) || []);
          setRecurrence({
            type: task.recurrence_type || null,
            interval: task.recurrence_interval || 1,
            endDate: task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '',
          });
          await fetchSubtasks();
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

  useEffect(() => {
    if (editingSubtaskId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSubtaskId]);

  const fetchSubtasks = async () => {
    try {
      const response = await apiClient.get(`/tasks/${id}/subtasks`);
      if (response.success) {
        // 🆕 Ordena no frontend também (garantia dupla)
        setSubtasks(sortSubtasks(response.data));
      }
    } catch (error) {
      console.error('Erro ao carregar subtarefas:', error);
    }
  };

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
      const response = await apiClient.patch(`/tasks/${id}`, {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        categoryIds,
        recurrence_type: recurrence.type,
        recurrence_interval: recurrence.interval,
        recurrence_end_date: recurrence.endDate
          ? new Date(recurrence.endDate).toISOString()
          : null,
      });
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

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setIsAdding(true);
    try {
      const response = await apiClient.post(`/tasks/${id}/subtasks`, {
        title: newSubtaskTitle.trim(),
        due_date: newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : null,
      });
      if (response.success) {
        // 🆕 Adiciona e reordena imediatamente
        setSubtasks((prev) => sortSubtasks([...prev, response.data]));
        setNewSubtaskTitle('');
        setNewSubtaskDueDate('');
        toast.success('Subtarefa adicionada!');
      }
    } catch (error) {
      toast.error('Erro ao adicionar subtarefa');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    // Atualização otimista (mantém posição)
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? {
              ...s,
              completed: !completed,
              completed_at: !completed ? new Date().toISOString() : null,
            }
          : s
      )
    );
    try {
      const response = await apiClient.patch(`/tasks/${id}/subtasks/${subtaskId}`, {
        completed: !completed,
      });
      if (response.success) {
        // Atualiza com os dados exatos e reordena
        setSubtasks((prev) =>
          sortSubtasks(prev.map((s) => (s.id === subtaskId ? response.data : s)))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Remover esta subtarefa?')) return;
    try {
      await apiClient.delete(`/tasks/${id}/subtasks/${subtaskId}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
      toast.success('Subtarefa removida!');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const startEditing = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const cancelEditing = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const saveEditing = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) {
      cancelEditing();
      return;
    }
    try {
      const response = await apiClient.patch(`/tasks/${id}/subtasks/${subtaskId}`, {
        title: editingSubtaskTitle.trim(),
      });
      if (response.success) {
        setSubtasks(
          subtasks.map((s) =>
            s.id === subtaskId ? { ...s, title: editingSubtaskTitle.trim() } : s
          )
        );
        toast.success('Subtarefa atualizada!');
        cancelEditing();
      }
    } catch (error) {
      toast.error('Erro ao editar');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(subtasks, oldIndex, newIndex);
    setSubtasks(newOrder);
    try {
      await apiClient.patch(`/tasks/${id}/subtasks/reorder`, {
        orderedIds: newOrder.map((s) => s.id),
      });
      toast.success('Ordem atualizada!');
    } catch (error) {
      setSubtasks(subtasks);
      toast.error('Erro ao reordenar');
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

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Categorias
          </label>
          <CategorySelector selectedIds={categoryIds} onChange={setCategoryIds} />
        </div>

        <div>
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
        </div>

        {/* Subtarefas */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            Subtarefas
            {subtasks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </span>
            )}
          </h3>

          {subtasks.length === 0 ? (
            <p className="text-gray-500 text-sm mb-3">Nenhuma subtarefa adicionada.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={sortedSubtasks.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2 mb-3">
                  <AnimatePresence>
                    {sortedSubtasks.map((subtask) => (
                      <SortableSubtask
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={() => handleToggleSubtask(subtask.id, subtask.completed)}
                        onDelete={() => handleDeleteSubtask(subtask.id)}
                        onEdit={() => startEditing(subtask)}
                        editingId={editingSubtaskId}
                        editingTitle={editingSubtaskTitle}
                        setEditingTitle={setEditingSubtaskTitle}
                        onSaveEdit={() => saveEditing(subtask.id)}
                        onCancelEdit={cancelEditing}
                        inputRef={inputRef}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* Adicionar subtarefa com data */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Nova subtarefa..."
              disabled={isAdding}
              className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <input
              type="datetime-local"
              value={newSubtaskDueDate}
              onChange={(e) => setNewSubtaskDueDate(e.target.value)}
              disabled={isAdding}
              className="border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50 text-sm"
              title="Data de vencimento (opcional)"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={isAdding || !newSubtaskTitle.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
            >
              <PlusIcon className="w-4 h-4" />
              Adicionar
            </button>
          </div>
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