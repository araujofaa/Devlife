'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@devlife/api-client';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  parseApiDate,
  getApiHourMinute,
  getApiDayKey,
  formatApiTime,
} from '@/lib/datetime';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string | null;
}

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  subtasks?: Subtask[];
  categories?: { category: Category }[];
}

interface CalendarItem {
  id: string;
  title: string;
  type: 'task' | 'subtask';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  taskId: string;
  parentTitle?: string;
  due_date: string;
  categories?: { category: Category }[];
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

// Cores por prioridade — bloco grande (view semana)
const priorityBlockColors = {
  high: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/50 dark:border-red-600 dark:text-red-200',
  medium:
    'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-200',
  low: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-600 dark:text-green-200',
};

// Cores por prioridade — bloco compacto (view mês)
const priorityBlockColorsCompact = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  medium:
    'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
  low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
};

// Barra lateral (painel de detalhes)
const priorityBarColors = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

function CalendarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = new Date();
  const initialYear = parseInt(searchParams.get('year') || String(today.getFullYear()));
  const initialMonth = parseInt(searchParams.get('month') || String(today.getMonth()));
  const initialView = (searchParams.get('view') as 'month' | 'week') || 'month';
  const initialWeekDate = searchParams.get('week_date');

  const [view, setView] = useState<'month' | 'week'>(initialView);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [weekStart, setWeekStart] = useState<Date>(
    initialWeekDate
      ? getStartOfWeek(new Date(initialWeekDate + 'T00:00:00'))
      : getStartOfWeek(today)
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // ============================================
  // Sincroniza URL
  // ============================================
  useEffect(() => {
    const params = new URLSearchParams();
    if (view === 'week') {
      params.set('view', 'week');
      params.set('week_date', getApiDayKey(weekStart.toISOString()));
    } else {
      if (year !== today.getFullYear() || month !== today.getMonth()) {
        params.set('year', String(year));
        params.set('month', String(month));
      }
    }
    const qs = params.toString();
    router.replace(`/calendar${qs ? `?${qs}` : ''}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, year, month, weekStart]);

  // ============================================
  // Range de busca
  // ============================================
  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === 'month') {
      return {
        rangeFrom: new Date(year, month, 1, 0, 0, 0, 0),
        rangeTo: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    } else {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { rangeFrom: new Date(weekStart), rangeTo: end };
    }
  }, [view, year, month, weekStart]);

  // ============================================
  // Busca tarefas
  // ============================================
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '500',
        due_date_from: rangeFrom.toISOString(),
        due_date_to: rangeTo.toISOString(),
      });

      const response = await apiClient.get(`/tasks?${params.toString()}`);
      if (response.success) {
        setTasks(response.data.tasks || []);
      } else {
        toast.error(response.error?.message || 'Erro ao carregar tarefas');
      }
    } catch (error) {
      console.error('[Calendar] Erro:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo]);

  // ============================================
  // Grid do mês (42 células)
  // ============================================
  const monthGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        key: `prev-${day}`,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
        key: `cur-${day}`,
      });
    }

    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({
        date: new Date(year, month + 1, nextDay),
        isCurrentMonth: false,
        key: `next-${nextDay}`,
      });
      nextDay++;
    }

    return cells;
  }, [year, month]);

  // ============================================
  // Dias da semana
  // ============================================
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // ============================================
  // Agrupa itens por dia (usa getApiDayKey → BRT)
  // ============================================
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    tasks.forEach((task) => {
      if (task.due_date) {
        const key = getApiDayKey(task.due_date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({
          id: task.id,
          title: task.title,
          type: 'task',
          completed: task.status === 'done',
          priority: task.priority,
          taskId: task.id,
          due_date: task.due_date,
          categories: task.categories,
        });
      }

      task.subtasks?.forEach((sub) => {
        if (sub.due_date) {
          const key = getApiDayKey(sub.due_date);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({
            id: sub.id,
            title: sub.title,
            type: 'subtask',
            completed: sub.completed,
            priority: task.priority,
            taskId: task.id,
            parentTitle: task.title,
            due_date: sub.due_date!,
          });
        }
      });
    });

    // Ordena por horário
    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aTime = parseApiDate(a.due_date)?.getTime() ?? 0;
        const bTime = parseApiDate(b.due_date)?.getTime() ?? 0;
        if (aTime !== bTime) return aTime - bTime;
        if (a.type !== b.type) return a.type === 'task' ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
    });

    return map;
  }, [tasks]);

  // ============================================
  // Estatísticas do mês
  // ============================================
  const monthStats = useMemo(() => {
    let totalTasks = 0;
    let totalSubtasks = 0;
    let doneTasks = 0;
    let doneSubtasks = 0;

    itemsByDay.forEach((items) => {
      items.forEach((item) => {
        if (item.type === 'task') {
          totalTasks++;
          if (item.completed) doneTasks++;
        } else {
          totalSubtasks++;
          if (item.completed) doneSubtasks++;
        }
      });
    });

    return { totalTasks, totalSubtasks, doneTasks, doneSubtasks };
  }, [itemsByDay]);

  // ============================================
  // Navegação
  // ============================================
  const goToPrev = () => {
    if (view === 'month') {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() - 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() + 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setWeekStart(getStartOfWeek(now));
  };

  // ============================================
  // Título do cabeçalho
  // ============================================
  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return `${MONTHS[month]} ${year}`;
    } else {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${weekStart.getDate()} - ${end.getDate()} de ${MONTHS[weekStart.getMonth()]}`;
      }
      return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
    }
  }, [view, year, month, weekStart]);

  // ============================================
  // RENDER: VIEW SEMANA
  // ============================================
  const renderWeekView = () => {
    const now = new Date();
    const nowTop = now.getHours() * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Header com os dias */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div></div>
          {weekDays.map((day) => {
            const todayCell = isSameDay(day, now);
            return (
              <div
                key={day.toISOString()}
                className={`p-2 text-center border-l border-gray-200 dark:border-gray-700 ${
                  todayCell ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {WEEKDAYS_SHORT[day.getDay()]}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    todayCell
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid das horas com scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {/* Coluna de horas */}
            <div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="text-right pr-2 text-[10px] text-gray-400 dark:text-gray-500"
                  style={{ height: `${HOUR_HEIGHT}px`, paddingTop: '4px' }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((day) => {
              const dayKey = getApiDayKey(day.toISOString());
              const items = itemsByDay.get(dayKey) || [];
              const visible = showCompleted
                ? items
                : items.filter((i) => !i.completed);
              const todayCell = isSameDay(day, now);

              return (
                <div
                  key={day.toISOString()}
                  className={`border-l border-gray-200 dark:border-gray-700 ${
                    todayCell ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                  }`}
                  style={{
                    position: 'relative',
                    height: `${HOUR_HEIGHT * 24}px`,
                  }}
                >
                  {/* Linhas horizontais das horas */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-gray-100 dark:border-gray-700/50"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Linha do "agora" */}
                  {todayCell && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${nowTop}px`,
                        height: '2px',
                        backgroundColor: '#ef4444',
                        zIndex: 20,
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '-4px',
                          top: '-3px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                        }}
                      />
                    </div>
                  )}

                  {/* Itens posicionados por hora (usa getApiHourMinute → BRT) */}
                  {visible.map((item) => {
                    const { hour, minute } = getApiHourMinute(item.due_date);
                    const topPx = hour * HOUR_HEIGHT + (minute / 60) * HOUR_HEIGHT;
                    const heightPx = HOUR_HEIGHT - 4;
                    const timeLabel = formatApiTime(item.due_date);

                    return (
                      <Link
                        key={item.id}
                        href={`/tasks/${item.taskId}/edit`}
                        className={`
                          rounded border-l-4 shadow-sm px-1.5 py-1
                          transition hover:shadow-md overflow-hidden
                          ${
                            item.completed
                              ? 'bg-gray-100 border-gray-400 text-gray-400 line-through dark:bg-gray-700 dark:border-gray-500 dark:text-gray-500 opacity-60'
                              : priorityBlockColors[item.priority]
                          }
                        `}
                        style={{
                          position: 'absolute',
                          top: `${topPx + 2}px`,
                          left: '2px',
                          right: '2px',
                          height: `${heightPx}px`,
                          zIndex: 10,
                        }}
                        title={`${item.title} — ${timeLabel}${
                          item.parentTitle ? ` (em "${item.parentTitle}")` : ''
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          {item.type === 'subtask' && (
                            <span className="text-[10px] shrink-0">↳</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold opacity-70">
                              {timeLabel}
                            </div>
                            <div className="text-[11px] font-medium leading-tight truncate">
                              {item.title}
                            </div>
                          </div>
                          {item.completed && (
                            <CheckCircleIcon className="w-3 h-3 shrink-0" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: VIEW MÊS
  // ============================================
  const renderMonthView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {WEEKDAYS_SHORT.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {monthGrid.map((cell) => {
            const dayKey = getApiDayKey(cell.date.toISOString());
            const items = itemsByDay.get(dayKey) || [];
            const visibleItems = showCompleted
              ? items
              : items.filter((i) => !i.completed);
            const MAX_VISIBLE = 3;
            const overflow = visibleItems.length - MAX_VISIBLE;
            const todayCell = isSameDay(cell.date, new Date());
            const isSelected = selectedDay === dayKey;

            return (
              <div
                key={cell.key}
                className={`min-h-[120px] border-b border-r border-gray-100 dark:border-gray-700 p-1.5 transition-colors cursor-pointer ${
                  !cell.isCurrentMonth
                    ? 'bg-gray-50 dark:bg-gray-900/30'
                    : 'bg-white dark:bg-gray-800'
                } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                onClick={() => setSelectedDay(isSelected ? null : dayKey)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      todayCell
                        ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                        : !cell.isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                  {cell.isCurrentMonth && visibleItems.length > 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {visibleItems.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {visibleItems.slice(0, MAX_VISIBLE).map((item) => (
                    <Link
                      key={item.id}
                      href={`/tasks/${item.taskId}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className={`
                        block text-[11px] leading-tight px-1.5 py-1 rounded border transition hover:shadow-md
                        ${
                          item.completed
                            ? 'bg-gray-100 text-gray-400 border-gray-200 line-through dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600'
                            : priorityBlockColorsCompact[item.priority]
                        }
                        ${
                          item.type === 'subtask'
                            ? 'border-l-4 border-l-blue-500 ml-1'
                            : ''
                        }
                      `}
                      title={`${item.title}${
                        item.parentTitle ? ` — em "${item.parentTitle}"` : ''
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        {item.type === 'subtask' && (
                          <span className="text-blue-500 shrink-0">↳</span>
                        )}
                        <span className="truncate flex-1">{item.title}</span>
                        {item.completed && (
                          <CheckCircleIcon className="w-3 h-3 shrink-0 text-green-500" />
                        )}
                      </div>
                    </Link>
                  ))}

                  {overflow > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(dayKey);
                      }}
                      className="block w-full text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left px-1.5"
                    >
                      +{overflow} mais...
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
            Calendário
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {monthStats.totalTasks} tarefas · {monthStats.totalSubtasks} subtarefas ·{' '}
            {monthStats.doneTasks + monthStats.doneSubtasks} concluídas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Mês / Semana */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
                view === 'month'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              Mês
            </button>
            <button
              onClick={() => setView('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
                view === 'week'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
              }`}
            >
              <ViewColumnsIcon className="w-4 h-4" />
              Semana
            </button>
          </div>

          <button
            onClick={goToPrev}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg min-w-[200px] text-center">
            <span className="font-bold text-gray-900 dark:text-white capitalize">
              {headerTitle}
            </span>
          </div>

          <button
            onClick={goToNext}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>

          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Hoje
          </button>

          <Link
            href="/tasks"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            Ver em lista
          </Link>
        </div>
      </div>

      {/* Toggle + legenda */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-700 dark:text-gray-300">Mostrar concluídas</span>
        </label>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-400"></span> Alta
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-400"></span> Média
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-400"></span> Baixa
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500"></span> Subtarefa
          </div>
        </div>
      </div>

      {/* Render da view ativa */}
      {view === 'month' ? renderMonthView() : renderWeekView()}

      {/* Painel de detalhes do dia (só no modo mês) */}
      {view === 'month' && selectedDay && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Fechar
            </button>
          </div>

          {(() => {
            const items = itemsByDay.get(selectedDay) || [];
            const visible = showCompleted ? items : items.filter((i) => !i.completed);

            if (visible.length === 0) {
              return (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Nenhum item neste dia.
                </p>
              );
            }

            return (
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/tasks/${item.taskId}/edit`}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition hover:shadow-md ${
                        item.completed
                          ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 opacity-70'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div
                        className={`w-2 h-10 rounded-full shrink-0 ${
                          item.completed
                            ? 'bg-gray-300'
                            : priorityBarColors[item.priority]
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.type === 'subtask' && (
                            <span className="text-xs text-blue-500 font-bold">
                              ↳ Subtarefa
                            </span>
                          )}
                          <p
                            className={`font-medium ${
                              item.completed
                                ? 'line-through text-gray-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.completed && (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        {item.parentTitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            em: {item.parentTitle}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatApiTime(item.due_date)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}