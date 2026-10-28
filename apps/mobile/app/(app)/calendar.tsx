import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { storage } from '@/src/services/storage';
import { syncService } from '@/src/services/sync';
import { apiClient } from '@devlife/api-client';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = (SCREEN_WIDTH - 32) / 7;

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date) => {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const parseApiDate = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function CalendarScreen() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const today = new Date();
  
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(today));
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(getStartOfWeek(today));

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadCache = useCallback(async () => {
    const cached = await storage.getItem<any[]>('tasks_cache');
    if (cached) {
      setTasks(cached.filter((t) => t.due_date || t.start_date || t.subtasks?.some((s: any) => s.due_date)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const init = async () => {
        await loadCache();
        try {
          const res = await apiClient.get<any>('/tasks?limit=1000');
          if (mounted && res.success && Array.isArray(res.data?.tasks)) {
            setTasks(res.data.tasks.filter((t: any) => t.due_date || t.start_date || t.subtasks?.some((s: any) => s.due_date)));
          }
        } catch (err) {
          console.warn('Calendar: falha ao buscar da API.');
        } finally {
          if (mounted) setLoading(false);
        }
      };
      init();
      const unsub = syncService.subscribe(() => loadCache());
      return () => { mounted = false; unsub(); };
    }, [loadCache])
  );

  // Remove o useMemo aqui para garantir que o texto atualize imediatamente
  const formattedSelectedDate = selectedDate.split('-').reverse().join('/');

  const monthGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false, key: `prev-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), isCurrentMonth: true, key: `cur-${day}` });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({ date: new Date(year, month + 1, nextDay), isCurrentMonth: false, key: `next-${nextDay}` });
      nextDay++;
    }
    return cells;
  }, [currentMonthDate]);

  const markedDatesData = useMemo(() => {
    const map = new Map<string, any[]>();
    tasks.forEach((task) => {
      const start = parseApiDate(task.start_date);
      const due = parseApiDate(task.due_date);
      
      if (due) {
        const dateKey = getLocalDateString(due);
        const items = map.get(dateKey) || [];
        items.push({ ...task, isSubtask: false, markerDate: due });
        map.set(dateKey, items);
      }
      if (start && due && !isSameDay(start, due)) {
        const dateKey = getLocalDateString(start);
        const items = map.get(dateKey) || [];
        if (!items.some(i => i.id === task.id)) {
           items.push({ ...task, isSubtask: false, markerDate: start });
           map.set(dateKey, items);
        }
      }
      task.subtasks?.forEach((sub: any) => {
        const subDue = parseApiDate(sub.due_date);
        if (subDue) {
          const dateKey = getLocalDateString(subDue);
          const items = map.get(dateKey) || [];
          items.push({ ...sub, taskId: task.id, priority: task.priority, isSubtask: true, parentTitle: task.title, status: sub.completed ? 'done' : 'pending', markerDate: subDue });
          map.set(dateKey, items);
        }
      });
    });
    return map;
  }, [tasks]);

  const selectedDayItems = useMemo(() => {
    const items = markedDatesData.get(selectedDate) || [];
    // IMPORTANTE: Usar [...items] para não mutar o array original do Map
    return [...items].sort((a, b) => {
      const dateA = a.markerDate?.getTime() || 0;
      const dateB = b.markerDate?.getTime() || 0;
      return dateA - dateB;
    });
  }, [selectedDate, markedDatesData]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekItemsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    const addItem = (key: string, item: any) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    };

    weekDays.forEach((day: Date) => {
      const dayStart = new Date(day).setHours(0, 0, 0, 0);
      const dayEnd = new Date(day).setHours(23, 59, 59, 999);
      const dayKey = getLocalDateString(day);

      tasks.forEach((task: any) => {
        const startRaw = parseApiDate(task.start_date);
        const dueRaw = parseApiDate(task.due_date);

        if (startRaw && dueRaw) {
          const tStart = new Date(startRaw).getTime();
          const tEnd = new Date(dueRaw).getTime();
          if (tEnd >= dayStart && tStart <= dayEnd) {
            addItem(dayKey, {
              ...task, isSubtask: false, isMultiDay: !isSameDay(startRaw, dueRaw),
              isStart: isSameDay(startRaw, day), isEnd: isSameDay(dueRaw, day)
            });
          }
        } else if (dueRaw) {
          const tEnd = new Date(dueRaw).getTime();
          if (tEnd >= dayStart && tEnd <= dayEnd) {
            addItem(dayKey, { ...task, isSubtask: false, isMultiDay: false });
          }
        } else if (startRaw) {
          const tStart = new Date(startRaw).getTime();
          if (tStart >= dayStart && tStart <= dayEnd) {
            addItem(dayKey, { ...task, isSubtask: false, isMultiDay: false });
          }
        }

        task.subtasks?.forEach((sub: any) => {
          if (sub.due_date) {
            const subDue = parseApiDate(sub.due_date);
            if (subDue && subDue.getTime() >= dayStart && subDue.getTime() <= dayEnd) {
              addItem(dayKey, { ...sub, taskId: task.id, priority: task.priority, isSubtask: true, parentTitle: task.title, status: sub.completed ? 'done' : 'pending', isMultiDay: false });
            }
          }
        });
      });

      const dayItems = map.get(dayKey) || [];
      dayItems.sort((a, b) => {
        const dateA = parseApiDate(a.due_date || a.start_date)?.getTime() || 0;
        const dateB = parseApiDate(b.due_date || b.start_date)?.getTime() || 0;
        return dateA - dateB;
      });
    });

    return map;
  }, [tasks, weekDays]);

  const goToPrev = () => {
    if (view === 'month') {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() - 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
    } else {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() + 7);
      setWeekStart(getStartOfWeek(newStart));
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(getLocalDateString(now));
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekStart(getStartOfWeek(now));
  };

  const renderTaskItem = (item: any) => {
    const isDone = item.status === 'done';
    const isMultiDay = item.isMultiDay;
    const start = parseApiDate(item.start_date);
    const due = parseApiDate(item.due_date);

    let borderColor = '#eab308';
    if (item.priority === 'high') borderColor = '#ef4444';
    if (item.priority === 'low') borderColor = '#22c55e';
    if (isDone) borderColor = '#d1d5db';

    const timeLabel = due ? due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      <TouchableOpacity
        style={[styles.taskCard, { borderLeftColor: borderColor }]}
        onPress={() => router.push(`/tasks/${item.isSubtask ? item.taskId : item.id}/edit`)}
        activeOpacity={0.7}
      >
        <View style={styles.taskCardContent}>
          {item.isSubtask && <Text style={styles.subtaskIcon}>↳</Text>}
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, isDone && styles.taskDone]} numberOfLines={2}>{item.title}</Text>
            {item.parentTitle && <Text style={styles.parentTitle} numberOfLines={1}>em {item.parentTitle}</Text>}
            {isMultiDay && start && due && (
              <Text style={styles.multiDayText}>
                {start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </Text>
            )}
          </View>
          <View style={styles.taskRight}>
            {!isMultiDay && timeLabel ? <Text style={styles.taskTime}>{timeLabel}</Text> : null}
            {item.recurrence_type && <View style={{ marginTop: 4 }}><Ionicons name="repeat" size={14} color="#8b5cf6" /></View>}
            {isDone && <View style={{ marginTop: 4 }}><Ionicons name="checkmark-circle" size={20} color="#22c55e" /></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.viewSelector}>
          <TouchableOpacity style={[styles.viewBtn, view === 'month' && styles.viewBtnActive]} onPress={() => setView('month')}>
            <Ionicons name="grid-outline" size={16} color={view === 'month' ? '#2563eb' : '#6b7280'} />
            <Text style={[styles.viewText, view === 'month' && styles.viewTextActive]}>Mês</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewBtn, view === 'week' && styles.viewBtnActive]} onPress={() => setView('week')}>
            <Ionicons name="calendar-outline" size={16} color={view === 'week' ? '#2563eb' : '#6b7280'} />
            <Text style={[styles.viewText, view === 'week' && styles.viewTextActive]}>Semana</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity onPress={goToPrev} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color="#374151" /></TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn}><Text style={styles.todayBtnText}>Hoje</Text></TouchableOpacity>
          <TouchableOpacity onPress={goToNext} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color="#374151" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Alta</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#eab308' }]} /><Text style={styles.legendText}>Média</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Baixa</Text></View>
      </View>

      {view === 'month' ? (
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.monthViewContainer}>
            <Text style={styles.monthTitle}>
              {MONTHS[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
            </Text>
            
            <View style={styles.weekDaysRow}>
              {WEEKDAYS_SHORT.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
            </View>

            <View style={styles.gridContainer}>
              {monthGrid.map((cell) => {
                const dateKey = getLocalDateString(cell.date);
                const isSelected = selectedDate === dateKey;
                const isToday = isSameDay(cell.date, new Date());
                const dayItems = markedDatesData.get(dateKey) || [];
                
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.cell,
                      !cell.isCurrentMonth && styles.cellOutside,
                      isSelected && styles.cellSelected
                    ]}
                    onPress={() => {
                       setSelectedDate(dateKey);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text 
                      pointerEvents="none"
                      style={[
                        styles.cellText,
                        !cell.isCurrentMonth && styles.cellTextOutside,
                        isSelected && styles.cellTextSelected,
                        isToday && !isSelected && styles.cellTextToday
                      ]}>
                      {cell.date.getDate()}
                    </Text>
                    
                    <View pointerEvents="none" style={styles.dotsContainer}>
                      {dayItems.slice(0, 3).map((item, idx) => {
                        const dotColor = item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#eab308' : '#22c55e';
                        return <View key={idx} style={[styles.dot, { backgroundColor: dotColor }]} />;
                      })}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Adicionado key={selectedDate} para forçar a atualização da lista */}
          <View key={`list-${selectedDate}`} style={styles.listContainer}>
            <Text style={styles.listTitle}>
              Tarefas de {formattedSelectedDate}
            </Text>
            {selectedDayItems.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma tarefa para este dia.</Text>
            ) : (
              selectedDayItems.map((item, idx) => <View key={idx}>{renderTaskItem(item)}</View>)
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.weekContainer}>
            {weekDays.map((day) => {
              const dayKey = getLocalDateString(day);
              const dayItems = weekItemsByDay.get(dayKey) || [];
              const isToday = isSameDay(day, new Date());

              return (
                <View key={dayKey} style={styles.weekDaySection}>
                  <View style={[styles.weekDayHeader, isToday && styles.weekDayHeaderToday]}>
                    <Text style={[styles.weekDayName, isToday && { color: '#2563eb' }]}>{WEEKDAYS_SHORT[day.getDay()]}</Text>
                    <Text style={[styles.weekDayNumber, isToday && { color: '#2563eb' }]}>{day.getDate()}</Text>
                  </View>
                  <View style={styles.weekDayContent}>
                    {dayItems.length === 0 ? (
                      <Text style={styles.weekEmptyText}>Sem tarefas</Text>
                    ) : (
                      dayItems.map((item, i) => <View key={i}>{renderTaskItem(item)}</View>)
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  viewSelector: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  viewBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  viewText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  viewTextActive: { color: '#2563eb', fontWeight: 'bold' },
  
  navControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 6 },
  todayBtn: { backgroundColor: '#eff6ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  todayBtnText: { color: '#2563eb', fontWeight: 'bold', fontSize: 13 },
  
  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },

  monthViewContainer: { backgroundColor: '#fff', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginTop: 16, marginBottom: 12, textTransform: 'capitalize' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginHorizontal: 16 },
  weekDayText: { width: CELL_WIDTH, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: CELL_WIDTH, height: 48, justifyContent: 'center', alignItems: 'center' },
  cellOutside: { opacity: 0.4 },
  cellSelected: { backgroundColor: '#2563eb', borderRadius: 8 },
  cellText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cellTextOutside: { color: '#9ca3af' },
  cellTextSelected: { color: '#fff' },
  cellTextToday: { color: '#2563eb', fontWeight: 'bold' },
  dotsContainer: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  listContainer: { padding: 16 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },

  taskCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  taskCardContent: { flexDirection: 'row', alignItems: 'flex-start' },
  subtaskIcon: { fontSize: 14, color: '#9ca3af', marginRight: 6, marginTop: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  taskDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  parentTitle: { fontSize: 12, color: '#6b7280', marginTop: 2, fontStyle: 'italic' },
  multiDayText: { fontSize: 11, color: '#2563eb', marginTop: 4, fontWeight: 'bold' },
  taskRight: { alignItems: 'flex-end', marginLeft: 8 },
  taskTime: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#9ca3af', fontStyle: 'italic' },

  weekContainer: { padding: 16 },
  weekDaySection: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  weekDayHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, backgroundColor: '#f9fafb', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  weekDayHeaderToday: { backgroundColor: '#eff6ff', borderBottomColor: '#bfdbfe' },
  weekDayName: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  weekDayNumber: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  weekDayContent: { padding: 12 },
  weekEmptyText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
});