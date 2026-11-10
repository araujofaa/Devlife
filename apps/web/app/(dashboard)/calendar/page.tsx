'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@devlife/api-client';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ArrowPathIcon,
  ClockIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  parseApiDate,
  getApiDayKey,
  formatApiTime,
  getApiHourMinute,
  formatApiDateTime,
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
  start_date?: string;
  due_date?: string;
  recurrence_type?: string | null;
  subtasks?: Subtask[];
  categories?: { category: Category }[];
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_HOUR_HEIGHT = 60;

function getStartOfWeek(date: Date | string | number): Date {
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

function CalendarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = new Date();
  const initialYear = parseInt(searchParams.get('year') || String(today.getFullYear()));
  const initialMonth = parseInt(searchParams.get('month') || String(today.getMonth()));
  const requestedView = searchParams.get('view');
  const initialView = requestedView === 'week' ? 'week' : 'month';
  const initialWeekDate = searchParams.get('week_date');

  const [view, setView] = useState<'month' | 'week'>(initialView);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [weekStart, setWeekStart] = useState<Date>(
    initialWeekDate
      ? getStartOfWeek(new Date(initialWeekDate + 'T00:00:00'))
      : getStartOfWeek(today)
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // 🆕 Estado para controlar o Popover de hover
  const [hoveredItem, setHoveredItem] = useState<{ item: any; rect: DOMRect } | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

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

  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === 'month') {
      return {
        rangeFrom: new Date(year, month - 1, 1, 0, 0, 0, 0),
        rangeTo: new Date(year, month + 2, 0, 23, 59, 59, 999),
      };
    } else {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const fetchFrom = new Date(weekStart);
      fetchFrom.setDate(fetchFrom.getDate() - 31);

      const fetchTo = new Date(end);
      fetchTo.setDate(fetchTo.getDate() + 31);

      return { rangeFrom: fetchFrom, rangeTo: fetchTo };
    }
  }, [view, year, month, weekStart]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendarTasks', { from: rangeFrom.toISOString(), to: rangeTo.toISOString() }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '1000',
        due_date_from: rangeFrom.toISOString(),
        due_date_to: rangeTo.toISOString(),
      });

      const response = await apiClient.get(`/tasks?${params.toString()}`);
      if (!response.success) {
        throw new Error('Erro ao carregar tarefas');
      }
      return response.data.tasks as Task[];
    },
    placeholderData: (previousData) => previousData,
  });

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

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weeksWithTasks = useMemo(() => {
    const weeks: any[] = [];
    
    for (let i = 0; i < 42; i += 7) {
      const week = monthGrid.slice(i, i + 7);
      const weekStartTime = new Date(week[0].date).setHours(0, 0, 0, 0);
      const weekEndTime = new Date(week[6].date).setHours(23, 59, 59, 999);

      const weekItems: any[] = [];

      tasks.forEach(task => {
        const startRaw = task.start_date ? parseApiDate(task.start_date) : null;
        const dueRaw = task.due_date ? parseApiDate(task.due_date) : null;

        if (startRaw && dueRaw) {
          const tStart = new Date(startRaw).setHours(0, 0, 0, 0);
          const tEnd = new Date(dueRaw).setHours(23, 59, 59, 999);

          if (tEnd >= weekStartTime && tStart <= weekEndTime) {
            let colStart = 0;
            let colEnd = 6;

            if (tStart > weekStartTime) {
              colStart = week.findIndex(c => new Date(c.date).setHours(0, 0, 0, 0) >= tStart);
              if (colStart === -1) colStart = 6;
            }
            if (tEnd < weekEndTime) {
              colEnd = week.findIndex(c => new Date(c.date).setHours(23, 59, 59, 999) > tEnd) - 1;
              if (colEnd === -1) colEnd = 6;
            }

            if (colStart < 0) colStart = 0;
            if (colEnd > 6) colEnd = 6;
            if (colStart > colEnd) colEnd = colStart;

            const actualStart = tStart >= weekStartTime;
            const actualEnd = tEnd <= weekEndTime;
            const isSingleDay = tStart === tEnd;

            weekItems.push({
              id: task.id,
              taskId: task.id,
              title: task.title,
              type: 'task',
              priority: task.priority,
              status: task.status,
              colStart,
              colEnd,
              actualStart,
              actualEnd,
              isSingleDay,
              due_date: task.due_date,
              start_date: task.start_date,
              recurrence_type: task.recurrence_type,
              categories: task.categories,
              parentTitle: null,
              isSubtask: false,
            });
          }
        } else if (dueRaw) {
          const tEnd = new Date(dueRaw).setHours(0, 0, 0, 0);
          if (tEnd >= weekStartTime && tEnd <= weekEndTime) {
            const col = week.findIndex(c => new Date(c.date).setHours(0, 0, 0, 0) === tEnd);
            if (col !== -1) {
              weekItems.push({
                id: task.id,
                taskId: task.id,
                title: task.title,
                type: 'task',
                priority: task.priority,
                status: task.status,
                colStart: col,
                colEnd: col,
                actualStart: true,
                actualEnd: true,
                isSingleDay: true,
                due_date: task.due_date,
                start_date: task.start_date,
                recurrence_type: task.recurrence_type,
                categories: task.categories,
                parentTitle: null,
                isSubtask: false,
              });
            }
          }
        }

        task.subtasks?.forEach(sub => {
          if (sub.due_date) {
            const tEnd = new Date(sub.due_date).setHours(0, 0, 0, 0);
            if (tEnd >= weekStartTime && tEnd <= weekEndTime) {
              const col = week.findIndex(c => new Date(c.date).setHours(0, 0, 0, 0) === tEnd);
              if (col !== -1) {
                weekItems.push({
                  id: sub.id,
                  taskId: task.id,
                  title: sub.title,
                  type: 'subtask',
                  priority: task.priority,
                  status: sub.completed ? 'done' : 'pending',
                  colStart: col,
                  colEnd: col,
                  actualStart: true,
                  actualEnd: true,
                  isSingleDay: true,
                  due_date: sub.due_date,
                  start_date: null,
                  recurrence_type: null,
                  categories: task.categories,
                  parentTitle: task.title,
                  isSubtask: true,
                });
              }
            }
          }
        });
      });

      weekItems.sort((a, b) => {
        const lenA = a.colEnd - a.colStart;
        const lenB = b.colEnd - b.colStart;
        if (lenA !== lenB) return lenB - lenA;
        return a.colStart - b.colStart;
      });

      const lanes: boolean[][] = [];
      weekItems.forEach(item => {
        let lane = 0;
        while (true) {
          if (!lanes[lane]) lanes[lane] = Array(7).fill(false);
          let hasSpace = true;
          for (let c = item.colStart; c <= item.colEnd; c++) {
            if (lanes[lane][c]) { hasSpace = false; break; }
          }
          if (hasSpace) {
            for (let c = item.colStart; c <= item.colEnd; c++) {
              lanes[lane][c] = true;
            }
            break;
          }
          lane++;
        }
        item.lane = lane;
      });

      weeks.push({ week, items: weekItems, maxLane: lanes.length });
    }
    return weeks;
  }, [monthGrid, tasks]);

  const weekItemsByDay = useMemo(() => {
    const map = new Map<string, any[]>();

    const addItem = (key: string, item: any) => {
      const existingItems = map.get(key);

      if (existingItems) {
        existingItems.push(item);
        return;
      }

      map.set(key, [item]);
    };

    weekDays.forEach(day => {
      const dayStart = new Date(day).setHours(0, 0, 0, 0);
      const dayEnd = new Date(day).setHours(23, 59, 59, 999);
      const dayKey = getApiDayKey(day.toISOString());

      tasks.forEach(task => {
        const startRaw = task.start_date ? parseApiDate(task.start_date) : null;
        const dueRaw = task.due_date ? parseApiDate(task.due_date) : null;

        if (startRaw && dueRaw) {
          const tStart = new Date(startRaw).getTime();
          const tEnd = new Date(dueRaw).getTime();

          if (tEnd >= dayStart && tStart <= dayEnd) {
            const isStart = isSameDay(new Date(startRaw), day);
            const isEnd = isSameDay(new Date(dueRaw), day);
            const isMultiDay = !isSameDay(new Date(startRaw), new Date(dueRaw));

            let displayDate = task.due_date; 
            if (isMultiDay) {
              if (isStart) displayDate = task.start_date || task.due_date;
              else if (isEnd) displayDate = task.due_date || task.start_date;
              else displayDate = task.start_date || task.due_date;
            }

            addItem(dayKey, {
              ...task,
              isSubtask: false,
              display_date: displayDate,
              isMultiDay,
              isStart,
              isEnd,
              parentTitle: null,
            });
          }
        } else if (dueRaw) {
          const tEnd = new Date(dueRaw).getTime();
          if (tEnd >= dayStart && tEnd <= dayEnd) {
            addItem(dayKey, {
              ...task,
              isSubtask: false,
              display_date: task.due_date,
              isMultiDay: false,
              isStart: true,
              isEnd: true,
              parentTitle: null,
            });
          }
        } else if (startRaw) {
          const tStart = new Date(startRaw).getTime();
          if (tStart >= dayStart && tStart <= dayEnd) {
            addItem(dayKey, {
              ...task,
              isSubtask: false,
              display_date: task.start_date,
              isMultiDay: false,
              isStart: true,
              isEnd: true,
              parentTitle: null,
            });
          }
        }

        task.subtasks?.forEach(sub => {
          if (sub.due_date) {
            const parsedSubDue = parseApiDate(sub.due_date);
            if (!parsedSubDue) return;
            const subDue = parsedSubDue.getTime();
            if (subDue >= dayStart && subDue <= dayEnd) {
              addItem(dayKey, {
                ...sub,
                taskId: task.id,
                priority: task.priority,
                isSubtask: true,
                parentTitle: task.title,
                status: sub.completed ? 'done' : 'pending',
                display_date: sub.due_date,
                isMultiDay: false,
                isStart: true,
                isEnd: true,
                categories: task.categories,
                recurrence_type: null,
                start_date: null,
              });
            }
          }
        });
      });
    });

    map.forEach((items, key) => {
      items.sort((a: any, b: any) => {
        let startMinA = 0;
        let startMinB = 0;
        try {
          const { hour: hA, minute: mA } = getApiHourMinute(a.display_date);
          const { hour: hB, minute: mB } = getApiHourMinute(b.display_date);
          startMinA = (isNaN(hA) ? 0 : hA) * 60 + (isNaN(mA) ? 0 : mA);
          startMinB = (isNaN(hB) ? 0 : hB) * 60 + (isNaN(mB) ? 0 : mB);
        } catch (e) {}
        return startMinA - startMinB;
      });
    });

    return map;
  }, [tasks, weekDays]);

  const hourHeights = useMemo(() => {
    const heights = Array(24).fill(BASE_HOUR_HEIGHT);
    
    for (let h = 0; h < 24; h++) {
      let maxTasksInHour = 0;
      let maxMinuteOffset = 0;

      weekDays.forEach(day => {
        const dayKey = getApiDayKey(day.toISOString());
        const dayItems = weekItemsByDay.get(dayKey) || [];
        
        const hourItems = dayItems.filter((item: any) => {
          let { hour } = getApiHourMinute(item.display_date);
          if (isNaN(hour)) hour = 0;
          return hour === h;
        });

        if (hourItems.length > 0) {
          if (hourItems.length > maxTasksInHour) {
            maxTasksInHour = hourItems.length;
          }
          
          const { minute } = getApiHourMinute(hourItems[0].display_date);
          if (!isNaN(minute) && minute > maxMinuteOffset) {
            maxMinuteOffset = minute;
          }
        }
      });

      if (maxTasksInHour > 0) {
        const neededHeight = maxMinuteOffset + (maxTasksInHour * 44) + (maxTasksInHour * 4) + 8;
        if (neededHeight > BASE_HOUR_HEIGHT) {
          heights[h] = neededHeight;
        }
      }
    }
    return heights;
  }, [weekItemsByDay, weekDays]);


  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    
    const selDayStart = new Date(selectedDay).setHours(0, 0, 0, 0);
    const selDayEnd = new Date(selectedDay).setHours(23, 59, 59, 999);
    
    const items: any[] = [];
    
    tasks.forEach(task => {
      const startRaw = task.start_date ? parseApiDate(task.start_date) : null;
      const dueRaw = task.due_date ? parseApiDate(task.due_date) : null;
      
      let matchesDay = false;
      
      if (startRaw && dueRaw) {
        const tStart = new Date(startRaw).setHours(0, 0, 0, 0);
        const tEnd = new Date(dueRaw).setHours(23, 59, 59, 999);
        if (tEnd >= selDayStart && tStart <= selDayEnd) matchesDay = true;
      } else if (dueRaw) {
        const tEnd = new Date(dueRaw).setHours(0, 0, 0, 0);
        if (tEnd >= selDayStart && tEnd <= selDayEnd) matchesDay = true;
      } else if (startRaw) {
        const tStart = new Date(startRaw).setHours(0, 0, 0, 0);
        if (tStart >= selDayStart && tStart <= selDayEnd) matchesDay = true;
      }
      
      if (matchesDay) {
        items.push({ ...task, isSubtask: false });
      }
      
      task.subtasks?.forEach(sub => {
        if (sub.due_date) {
          const parsedSubDue = parseApiDate(sub.due_date);
          if (parsedSubDue) {
            const subDue = new Date(parsedSubDue).setHours(0, 0, 0, 0);
            if (subDue >= selDayStart && subDue <= selDayEnd) {
            items.push({
              ...sub,
              taskId: task.id,
              priority: task.priority,
              isSubtask: true,
              parentTitle: task.title,
              status: sub.completed ? 'done' : 'pending',
            });
            }
          }
        }
      });
    });
    
    return items;
  }, [selectedDay, tasks]);

  const goToPrev = () => {
    setSelectedDay(null);
    if (view === 'month') {
      if (month === 0) { setMonth(11); setYear(year - 1); }
      else setMonth(month - 1);
    } else {
      const newStart = new Date(weekStart); newStart.setDate(newStart.getDate() - 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToNext = () => {
    setSelectedDay(null);
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear(year + 1); }
      else setMonth(month + 1);
    } else {
      const newStart = new Date(weekStart); newStart.setDate(newStart.getDate() + 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToToday = () => {
    setSelectedDay(null);
    const now = new Date();
    setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekStart(getStartOfWeek(now));
  };

  const headerTitle = useMemo(() => {
    if (view === 'month') return `${MONTHS[month]} ${year}`;
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    if (weekStart.getMonth() === end.getMonth()) return `${weekStart.getDate()} - ${end.getDate()} de ${MONTHS[weekStart.getMonth()]}`;
    return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].substring(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].substring(0, 3)}`;
  }, [view, year, month, weekStart]);

  // 🆕 Funções para controlar o Hover
  const handleMouseEnter = (e: React.MouseEvent, item: any) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem({ item, rect });
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredItem(null);
    }, 150);
    setHoverTimeout(timeout);
  };

  // ============================================
  // RENDER: VIEW MÊS
  // ============================================
  const renderMonthView = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {isLoading && tasks.length === 0 ? (
        <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="flex flex-col">
          {weeksWithTasks.map(({ week, items, maxLane }, weekIdx) => (
            <div 
              key={weekIdx} 
              className="relative border-b border-gray-100 dark:border-gray-700 flex flex-col" 
              style={{ minHeight: `${Math.max(120, 36 + maxLane * 28)}px` }}
            >
              <div className="absolute inset-0 grid grid-cols-7">
                {week.map((cell: { date: Date; isCurrentMonth: boolean; key: string }) => {
                  const isSelected = selectedDay && isSameDay(cell.date, selectedDay);
                  return (
                    <div
                      key={cell.key}
                      onClick={() =>
                        setSelectedDay((prev) =>
                          prev && isSameDay(prev, cell.date) ? null : cell.date
                        )
                      }
                      className={`border-r border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : !cell.isCurrentMonth
                            ? 'bg-gray-50 dark:bg-gray-900/30'
                            : ''
                      }`}
                    />
                  );
                })}
              </div>

              <div className="relative grid grid-cols-7 pointer-events-none z-10 pt-1.5 h-8">
                {week.map((cell: { date: Date; isCurrentMonth: boolean; key: string }) => {
                  const todayCell = isSameDay(cell.date, new Date());
                  return (
                    <div key={cell.key} className="px-1.5 flex justify-between items-start">
                      <span className={`text-xs font-bold ${todayCell ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : !cell.isCurrentMonth ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {cell.date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="relative z-20 w-full flex-1 pointer-events-none">
                {items.map((item: any) => {
                  let bgClass = 'bg-yellow-400 text-yellow-900';
                  if (item.status === 'done') bgClass = 'bg-gray-200 text-gray-500 line-through dark:bg-gray-700 dark:text-gray-500';
                  else if (item.priority === 'high') bgClass = 'bg-red-500 text-white';
                  else if (item.priority === 'low') bgClass = 'bg-green-500 text-white';

                  let radiusClass = 'rounded-md';
                  if (!item.isSingleDay) {
                    if (item.actualStart) radiusClass = 'rounded-l-md border-l border-black/10';
                    if (item.actualEnd) radiusClass = 'rounded-r-md border-r border-black/10';
                    if (!item.actualStart && !item.actualEnd) radiusClass = 'rounded-none';
                  }

                  let paddingClass = '';
                  if (item.isSingleDay) {
                    paddingClass = 'px-1';
                  } else {
                    if (item.actualStart) paddingClass += ' pl-1';
                    if (item.actualEnd) paddingClass += ' pr-1';
                  }

                  const isMultiDay = !item.isSingleDay;
                  const justifyClass = isMultiDay ? 'justify-center' : 'justify-start';
                  const textClass = isMultiDay ? 'text-center' : 'text-left';
                  const showTitle = item.actualStart || item.isSingleDay || item.colStart === 0;
                  
                  const href = `/tasks/${item.taskId}/edit${item.type === 'subtask' ? `?subtask=${item.id}` : ''}`;

                  return (
                    <div
                      key={item.id}
                      className={`absolute ${paddingClass} pointer-events-auto`}
                      style={{
                        left: `${(item.colStart / 7) * 100}%`,
                        width: `${((item.colEnd - item.colStart + 1) / 7) * 100}%`,
                        top: `${item.lane * 26}px`,
                        height: '22px',
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, item)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <Link
                        href={href}
                        className={`flex items-center w-full h-full px-1.5 text-[11px] leading-tight transition hover:brightness-110 overflow-hidden ${bgClass} ${radiusClass} ${justifyClass}`}
                        // 🆕 Título removido daqui
                      >
                        <div className="flex items-center w-full min-w-0">
                          {showTitle && item.type === 'task' && item.recurrence_type && (
                            <ArrowPathIcon className="w-3 h-3 shrink-0 opacity-80 mr-1" />
                          )}
                          <span className={`truncate flex-1 ${textClass} font-medium`}>
                            {showTitle ? item.title : ''}
                          </span>
                          {item.actualEnd && item.due_date && (
                            <span className="text-[9px] opacity-80 shrink-0 ml-1">
                              {formatApiTime(item.due_date)}
                            </span>
                          )}
                          {item.status === 'done' && (
                            <CheckCircleIcon className="w-3 h-3 shrink-0 ml-1" />
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: VIEW SEMANA
  // ============================================
  const renderWeekView = () => {
    const now = new Date();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-30">
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

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <div className="flex flex-col">
            {HOURS.map(h => {
              const height = hourHeights[h];
              return (
                <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height }}>
                  <div className="text-right pr-2 text-[10px] text-gray-400 dark:text-gray-500 pt-1 font-medium">
                    {h.toString().padStart(2, '0')}:00
                  </div>

                  {weekDays.map(day => {
                    const dayKey = getApiDayKey(day.toISOString());
                    const dayItems = weekItemsByDay.get(dayKey) || [];
                    
                    const hourItems = dayItems.filter((item: any) => {
                      let { hour } = getApiHourMinute(item.display_date);
                      if (isNaN(hour)) hour = 0;
                      return hour === h;
                    });

                    const todayCell = isSameDay(day, now);
                    const isCurrentHour = todayCell && now.getHours() === h;

                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`border-l border-b border-gray-100 dark:border-gray-700/50 relative flex flex-col min-w-0 ${
                          todayCell ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        {hourItems.map((item: any, idx: number) => {
                          const { minute } = getApiHourMinute(item.display_date);
                          
                          const isFirst = idx === 0;
                          const marginTop = isFirst ? (minute || 0) : 4;
                          
                          let timeLabel = formatApiTime(item.display_date);
                          if (item.isMultiDay) {
                            if (item.isStart && !item.isEnd) timeLabel = `Início ${timeLabel}`;
                            else if (!item.isStart && item.isEnd) timeLabel = `Fim ${timeLabel}`;
                            else if (!item.isStart && !item.isEnd) timeLabel = `Contínuo`;
                          }

                          let bgClass = 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-200';
                          if (item.status === 'done') bgClass = 'bg-gray-100 border-gray-400 text-gray-400 line-through dark:bg-gray-700 dark:border-gray-500 dark:text-gray-500 opacity-60';
                          else if (item.priority === 'high') bgClass = 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/50 dark:border-red-600 dark:text-red-200';
                          else if (item.priority === 'low') bgClass = 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-600 dark:text-green-200';

                          const href = `/tasks/${item.taskId}/edit${item.isSubtask ? `?subtask=${item.id}` : ''}`;

                          return (
                            <div
                              key={`${item.id}-${dayKey}-${idx}`}
                              style={{ marginTop, flexShrink: 0, width: 'calc(100% - 8px)' }}
                              className="mx-1"
                              onMouseEnter={(e) => handleMouseEnter(e, item)}
                              onMouseLeave={handleMouseLeave}
                            >
                              <Link
                                href={href}
                                className={`rounded border-l-4 shadow-sm px-1.5 py-1 transition hover:shadow-md overflow-hidden flex flex-col justify-center min-w-0 h-[40px] ${bgClass}`}
                                // 🆕 Título removido daqui também
                              >
                                <div className="flex items-center gap-1 w-full min-w-0">
                                  {item.isSubtask && <span className="text-[10px] shrink-0">↳</span>}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-semibold opacity-70 truncate leading-tight">{timeLabel}</div>
                                    <div className="text-[11px] font-medium truncate leading-tight">{item.title}</div>
                                  </div>
                                  {item.status === 'done' && <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />}
                                </div>
                              </Link>
                            </div>
                          );
                        })}

                        {isCurrentHour && (
                          <div 
                            className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none" 
                            style={{ top: (now.getMinutes() / 60) * height }}
                          >
                            <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                          </div>
                        )}
                      </div>
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
  // RENDER: PAINEL DO DIA SELECIONADO
  // ============================================
  const renderSelectedDayPanel = () => {
    if (!selectedDay) return null;

    const formattedDate = selectedDay.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
            {formattedDate}
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              ({selectedDayItems.length} {selectedDayItems.length === 1 ? 'item' : 'itens'})
            </span>
          </h3>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Fechar
          </button>
        </div>

        <div className="p-4">
          {selectedDayItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma tarefa ou subtarefa para este dia.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {selectedDayItems.map((item, idx) => {
                const editHref = `/tasks/${item.isSubtask ? item.taskId : item.id}/edit${item.isSubtask ? `?subtask=${item.id}` : ''}`;

                let dotClass = 'bg-yellow-400';
                if (item.status === 'done') dotClass = 'bg-gray-400';
                else if (item.priority === 'high') dotClass = 'bg-red-500';
                else if (item.priority === 'low') dotClass = 'bg-green-500';

                const isDone = item.status === 'done';
                const startDate = item.start_date ? parseApiDate(item.start_date) : null;
                const dueDate = item.due_date ? parseApiDate(item.due_date) : null;
                const isMultiDay = startDate !== null && dueDate !== null && !isSameDay(startDate, dueDate);

                return (
                  <li key={`${item.isSubtask ? 'sub' : 'task'}-${item.id}-${idx}`}>
                    <Link
                      href={editHref}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                      {item.isSubtask && (
                        <span className="text-xs text-gray-400 shrink-0" title="Subtarefa">↳</span>
                      )}
                      <span
                        className={`flex-1 text-sm truncate ${
                          isDone
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.isSubtask && item.parentTitle && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 truncate max-w-[180px]">
                          em {item.parentTitle}
                        </span>
                      )}
                      {item.recurrence_type && (
                        <ArrowPathIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" title="Recorrente" />
                      )}
                      {isMultiDay && startDate && dueDate && (
                        <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded shrink-0">
                          {startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {item.due_date && !isMultiDay && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                          {formatApiTime(item.due_date)}
                        </span>
                      )}
                      {isDone && <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
            Calendário
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => setView('month')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${view === 'month' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'}`}>
              <Squares2X2Icon className="w-4 h-4" /> Mês
            </button>
            <button onClick={() => setView('week')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${view === 'week' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'}`}>
              <ViewColumnsIcon className="w-4 h-4" /> Semana
            </button>
          </div>

          <button onClick={goToPrev} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"><ChevronLeftIcon className="w-5 h-5" /></button>
          <div className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg min-w-[200px] text-center">
            <span className="font-bold text-gray-900 dark:text-white capitalize">{headerTitle}</span>
          </div>
          <button onClick={goToNext} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"><ChevronRightIcon className="w-5 h-5" /></button>
          <button onClick={goToToday} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Hoje</button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Alta</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span> Média</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500"></span> Baixa</div>
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderWeekView()}

      {view === 'month' && renderSelectedDayPanel()}

      {/* 🆕 POPOVER DE DETALHES (HOVER CARD) */}
      {hoveredItem && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-72 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: Math.min(hoveredItem.rect.bottom + 8, window.innerHeight - 280),
            left: Math.min(hoveredItem.rect.left, window.innerWidth - 300),
          }}
          onMouseEnter={() => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Linha colorida no topo baseada na prioridade */}
          <div className={`h-1.5 w-full ${
            hoveredItem.item.status === 'done' ? 'bg-gray-400' :
            hoveredItem.item.priority === 'high' ? 'bg-red-500' :
            hoveredItem.item.priority === 'low' ? 'bg-green-500' : 'bg-yellow-400'
          }`} />

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                {hoveredItem.item.title}
              </h4>
              {hoveredItem.item.recurrence_type && (
                <ArrowPathIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" title="Tarefa Recorrente" />
              )}
            </div>

            {/* Horário */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 mb-3">
              <ClockIcon className="w-4 h-4 shrink-0" />
              <span>
                {hoveredItem.item.start_date && hoveredItem.item.due_date && hoveredItem.item.start_date !== hoveredItem.item.due_date ? (
                  <>
                    {formatApiDateTime(hoveredItem.item.start_date).split(' ')[0]} até {formatApiDateTime(hoveredItem.item.due_date)}
                  </>
                ) : hoveredItem.item.due_date ? (
                  formatApiDateTime(hoveredItem.item.due_date)
                ) : (
                  'Sem data definida'
                )}
              </span>
            </div>

            {/* Badges de Status e Prioridade */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                hoveredItem.item.status === 'done' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {hoveredItem.item.status === 'done' ? '✅ Concluída' : '⏳ Pendente'}
              </span>
              
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                hoveredItem.item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                hoveredItem.item.priority === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {hoveredItem.item.priority === 'high' ? '🔴 Alta' : hoveredItem.item.priority === 'low' ? '🟢 Baixa' : '🟡 Média'}
              </span>
            </div>

            {/* Subtarefa Info */}
            {hoveredItem.item.isSubtask && hoveredItem.item.parentTitle && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-md">
                <span className="font-semibold">Subtarefa de:</span> {hoveredItem.item.parentTitle}
              </div>
            )}

            {/* Categorias */}
            {hoveredItem.item.categories && hoveredItem.item.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {hoveredItem.item.categories.map((tc: any, i: number) => (
                  <span 
                    key={i} 
                    className="px-2 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: tc.category.color }}
                  >
                    {tc.category.name}
                  </span>
                ))}
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <Link
                href={`/tasks/${hoveredItem.item.taskId}/edit${hoveredItem.item.isSubtask ? `?subtask=${hoveredItem.item.id}` : ''}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <CalendarContent />
    </Suspense>
  );
}