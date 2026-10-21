import { useCallback, useState, useMemo, useEffect } from 'react';
import { 
  View, FlatList, StyleSheet, Text, TouchableOpacity, 
  RefreshControl, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { syncService } from '@/src/services/sync';
import { storage } from '@/src/services/storage';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { CustomModal } from '@/src/components/CustomModal';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// 🌍 Força o calendário a ficar 100% em Português
LocaleConfig.locales['pt'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

interface Category { id: string; name: string; color: string; }
interface Subtask { id: string; title: string; completed: boolean; due_date?: string | null; }
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'done';
  due_date?: string;
  categories?: { category: Category }[];
  subtasks?: Subtask[];
  recurrence_type?: string | null;
}

type TabType = 'pending' | 'done' | 'all';

// Função para ordenar subtarefas por data (mais próxima primeiro, sem data no final)
const sortSubtasksByDate = (subtasks: Subtask[]) => {
  return [...subtasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
};

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [search, setSearch] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Estados de Exclusão
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Estados de Edição Rápida (Metadados da Tarefa Principal)
  const [editingTask, setEditingTask] = useState<{ task: Task; field: 'priority' | 'status' | 'date' | 'category' } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [tempCategoryIds, setTempCategoryIds] = useState<string[]>([]);

  // Estados para Editar Data da Subtarefa
  const [subtaskDateEdit, setSubtaskDateEdit] = useState<{ taskId: string; subtask: Subtask } | null>(null);
  const [subSelectedDate, setSubSelectedDate] = useState('');
  const [subSelectedTime, setSubSelectedTime] = useState('');
  const [savingSubDate, setSavingSubDate] = useState(false);

  const router = useRouter();

  const loadCache = async () => {
    const cached = (await storage.getItem<Task[]>('tasks_cache')) ?? [];
    setTasks(cached);
  };

  useFocusEffect(
    useCallback(() => {
      loadCache();
      const unsub = syncService.subscribe(loadCache);
      return unsub;
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await syncService.sync().catch(() => {});
    await loadCache();
    setRefreshing(false);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    await syncService.deleteTask(taskToDelete);
    setDeleting(false);
    setTaskToDelete(null);
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedTasks(newSet);
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, currentCompleted: boolean) => {
    // 1. Atualiza o estado visual (React)
    const updatedTasks = tasks.map(t => 
      t.id === taskId 
        ? { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !currentCompleted } : s) }
        : t
    );
    setTasks(updatedTasks);

    try {
      // 2. Salva no servidor
      await apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { completed: !currentCompleted });
      
      // 🆕 3. Salva no cache local para o sync em background não sobrescrever
      await storage.setItem('tasks_cache', updatedTasks);
    } catch {
      // Reverte se der erro
      setTasks(tasks);
      Alert.alert('Erro', 'Não foi possível atualizar a subtarefa.');
    }
  };

  // --- Funções de Edição Rápida (Tarefa Principal) ---
  const openEditModal = (task: Task, field: 'priority' | 'status' | 'date' | 'category') => {
    setEditingTask({ task, field });
    
    if (field === 'date') {
      if (task.due_date) {
        const d = new Date(task.due_date);
        setSelectedDate(d.toISOString().split('T')[0]);
        setSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      } else {
        setSelectedDate(new Date().toISOString().split('T')[0]);
        setSelectedTime('12:00');
      }
    }
    
    if (field === 'category') {
      setTempCategoryIds(task.categories?.map(c => c.category.id) || []);
    }
  };

  const handleSaveMeta = async (payload: any) => {
    if (!editingTask) return;
    setSavingMeta(true);
    
    if (editingTask.field === 'priority') {
      setTasks(tasks.map(t => t.id === editingTask.task.id ? { ...t, priority: payload.priority } : t));
    } else if (editingTask.field === 'status') {
      setTasks(tasks.map(t => t.id === editingTask.task.id ? { ...t, status: payload.status } : t));
    } else if (editingTask.field === 'date') {
      setTasks(tasks.map(t => t.id === editingTask.task.id ? { ...t, due_date: payload.due_date } : t));
    } else if (editingTask.field === 'category') {
      const cachedCategories = (await storage.getItem<Category[]>('categories_cache')) || [];
      const optimisticCategories = (payload.categoryIds || []).map((cid: string) => {
        const cat = cachedCategories.find((c) => c.id === cid);
        return cat ? { category: cat } : null;
      }).filter(Boolean);
      setTasks(tasks.map(t => t.id === editingTask.task.id ? { ...t, categories: optimisticCategories } : t));
    }

    try {
      const res = await syncService.updateTask(editingTask.task.id, payload);
      if (!res.success) Alert.alert('Erro', res.error || 'Erro ao salvar.');
      setEditingTask(null);
    } catch {
      Alert.alert('Erro', 'Falha de conexão.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSaveMainDate = () => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
    handleSaveMeta({ due_date: localDate.toISOString() });
  };

  const removeMainDate = () => handleSaveMeta({ due_date: null });

  const handleToggleCategoryQuick = (cid: string) => {
    if (tempCategoryIds.includes(cid)) {
      setTempCategoryIds(tempCategoryIds.filter(id => id !== cid));
    } else {
      setTempCategoryIds([...tempCategoryIds, cid]);
    }
  };

  // --- Funções de Edição de Data da SUBTAREFA ---
  const openSubtaskDateModal = (taskId: string, sub: Subtask) => {
    setSubtaskDateEdit({ taskId, subtask: sub });
    if (sub.due_date) {
      const d = new Date(sub.due_date);
      setSubSelectedDate(d.toISOString().split('T')[0]);
      setSubSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setSubSelectedDate(new Date().toISOString().split('T')[0]);
      setSubSelectedTime('12:00');
    }
  };

  const handleSaveSubtaskDate = async () => {
    if (!subtaskDateEdit || !subSelectedDate) return;
    setSavingSubDate(true);
    
    try {
      const [year, month, day] = subSelectedDate.split('-').map(Number);
      const [hours, minutes] = subSelectedTime.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
      const isoDate = localDate.toISOString();

      const updatedTasks = tasks.map(t => 
        t.id === subtaskDateEdit.taskId 
          ? { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskDateEdit.subtask.id ? { ...s, due_date: isoDate } : s) }
          : t
      );
      setTasks(updatedTasks);
      await storage.setItem('tasks_cache', updatedTasks);

      await apiClient.patch(`/tasks/${subtaskDateEdit.taskId}/subtasks/${subtaskDateEdit.subtask.id}`, { due_date: isoDate });
      setSubtaskDateEdit(null);
    } catch {
      Alert.alert('Erro', 'Erro ao atualizar data da subtarefa.');
    } finally {
      setSavingSubDate(false);
    }
  };

  const removeSubtaskDate = async () => {
    if (!subtaskDateEdit) return;
    setSavingSubDate(true);
    
    const updatedTasks = tasks.map(t => 
      t.id === subtaskDateEdit.taskId 
        ? { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskDateEdit.subtask.id ? { ...s, due_date: null } : s) }
        : t
    );
    setTasks(updatedTasks);
    await storage.setItem('tasks_cache', updatedTasks);

    try {
      await apiClient.patch(`/tasks/${subtaskDateEdit.taskId}/subtasks/${subtaskDateEdit.subtask.id}`, { due_date: null });
      setSubtaskDateEdit(null);
    } catch {
      Alert.alert('Erro', 'Erro ao remover data.');
    } finally {
      setSavingSubDate(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      if (activeTab === 'pending' && t.status === 'done') return false;
      if (activeTab === 'done' && t.status !== 'done') return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks, activeTab, search]);

  const priorityColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };
  const getPriorityLabel = (p: string) => p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta';

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {(['pending', 'done', 'all'] as TabType[]).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'pending' ? 'Pendentes' : tab === 'done' ? 'Concluídas' : 'Todas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar tarefas..." value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const isDone = item.status === 'done';
          const isExpanded = expandedTasks.has(item.id);
          const completedSubs = item.subtasks?.filter(s => s.completed).length || 0;
          const totalSubs = item.subtasks?.length || 0;
          const progress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
          const sortedSubtasks = item.subtasks ? sortSubtasksByDate(item.subtasks) : [];

          return (
            <View style={[styles.card, isDone && { opacity: 0.7, backgroundColor: '#f3f4f6' }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <TouchableOpacity onPress={() => toggleExpand(item.id)} style={{ padding: 4, marginRight: 4 }}>
                    <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={[styles.cardTitle, isDone && styles.textLineThrough]} numberOfLines={2}>{item.title}</Text>
                  {item.recurrence_type && <Ionicons name="repeat" size={14} color="#8b5cf6" style={{ marginLeft: 4 }} />}
                </View>
                
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/tasks/${item.id}/edit`)}>
                    <Ionicons name="pencil" size={16} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => setTaskToDelete(item.id)}>
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
              
              <View style={styles.badgesRow}>
                {item.categories?.map(c => (
                  <TouchableOpacity 
                    key={c.category.id} 
                    style={[styles.badge, { backgroundColor: c.category.color }]}
                    onPress={() => openEditModal(item, 'category')}
                  >
                    <Text style={styles.badgeText}>{c.category.name}</Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                  style={[styles.badge, { backgroundColor: '#e5e7eb', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }]} 
                  onPress={() => openEditModal(item, 'category')}
                >
                  <Ionicons name="add" size={14} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.badge, { backgroundColor: priorityColors[item.priority] }]}
                  onPress={() => openEditModal(item, 'priority')}
                >
                  <Text style={styles.badgeText}>{getPriorityLabel(item.priority)}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.badge, { backgroundColor: isDone ? '#22c55e' : '#f59e0b' }]}
                  onPress={() => openEditModal(item, 'status')}
                >
                  <Text style={styles.badgeText}>{isDone ? 'Concluída' : 'Pendente'}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.badge, { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' }]}
                  onPress={() => openEditModal(item, 'date')}
                >
                  <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>
                    {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '+ Data'}
                  </Text>
                </TouchableOpacity>
              </View>

              {totalSubs > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isDone ? '#22c55e' : '#2563eb' }]} />
                  </View>
                  <Text style={styles.progressText}>{progress}%</Text>
                </View>
              )}

              {isExpanded && sortedSubtasks.length > 0 && (
                <View style={styles.subtasksContainer}>
                  {sortedSubtasks.map(sub => {
                    const isOverdue = sub.due_date && !sub.completed && new Date(sub.due_date) < new Date();
                    return (
                      <View key={sub.id} style={styles.subtaskItem}>
                        <TouchableOpacity 
                          onPress={() => handleToggleSubtask(item.id, sub.id, sub.completed)} 
                          style={{ padding: 4, paddingRight: 8 }}
                        >
                          <View style={[
                            styles.customCheckbox,
                            sub.completed ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : { borderColor: '#d1d5db' }
                          ]}>
                            {sub.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
                          </View>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <TouchableOpacity onPress={() => handleToggleSubtask(item.id, sub.id, sub.completed)}>
                            <Text style={[styles.subtaskText, sub.completed && styles.textLineThrough]}>{sub.title}</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity onPress={() => openSubtaskDateModal(item.id, sub)} style={styles.subtaskDateBtn}>
                            <Ionicons name="calendar-outline" size={12} color={isOverdue ? '#ef4444' : '#2563eb'} />
                            <Text style={[styles.subtaskDateText, isOverdue && { color: '#ef4444', fontWeight: 'bold' }]}>
                              {sub.due_date 
                                ? `${isOverdue ? 'Atrasada: ' : 'Vence: '}${new Date(sub.due_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                                : 'Adicionar data'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 40 }}><Ionicons name="clipboard-outline" size={48} color="#d1d5db" /><Text style={styles.empty}>Nenhuma tarefa encontrada.</Text></View>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/tasks/create')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* MODAL DE EXCLUSÃO DE TAREFA */}
      <CustomModal visible={!!taskToDelete} onRequestClose={() => setTaskToDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Tarefa?</Text>
            <Text style={styles.modalText}>Essa ação não pode ser desfeita.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTaskToDelete(null)} disabled={deleting}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteConfirm} disabled={deleting}>{deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteBtnText}>Excluir</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>

      {/* MODAL DE EDIÇÃO RÁPIDA */}
      <CustomModal visible={!!editingTask} onRequestClose={() => setEditingTask(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {editingTask?.field === 'priority' && (
              <>
                <Text style={styles.modalTitle}>Prioridade</Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <TouchableOpacity key={p} style={[styles.modalOption, editingTask.task.priority === p && { backgroundColor: '#eff6ff', borderColor: '#2563eb' }]} onPress={() => handleSaveMeta({ priority: p })}>
                      <View style={[styles.colorDot, { backgroundColor: priorityColors[p] }]} />
                      <Text style={styles.modalOptionText}>{getPriorityLabel(p)}</Text>
                      {editingTask.task.priority === p && <Ionicons name="checkmark" size={20} color="#2563eb" style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {editingTask?.field === 'status' && (
              <>
                <Text style={styles.modalTitle}>Status</Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  {(['pending', 'done'] as const).map(s => (
                    <TouchableOpacity key={s} style={[styles.modalOption, editingTask.task.status === s && { backgroundColor: '#eff6ff', borderColor: '#2563eb' }]} onPress={() => handleSaveMeta({ status: s })}>
                      <Ionicons name={s === 'pending' ? 'time' : 'checkmark-circle'} size={20} color={s === 'pending' ? '#f59e0b' : '#22c55e'} />
                      <Text style={styles.modalOptionText}>{s === 'pending' ? 'Pendente' : 'Concluída'}</Text>
                      {editingTask.task.status === s && <Ionicons name="checkmark" size={20} color="#2563eb" style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {editingTask?.field === 'category' && (
              <>
                <Text style={styles.modalTitle}>Categorias</Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>Selecione as categorias:</Text>
                <CategorySelectorQuick selectedIds={tempCategoryIds} onToggle={handleToggleCategoryQuick} />
                <View style={[styles.modalActions, { marginTop: 24 }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingTask(null)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveMeta({ categoryIds: tempCategoryIds })} disabled={savingMeta}>
                    {savingMeta ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {editingTask?.field === 'date' && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.modalTitle}>Data de Vencimento</Text>
                  <TouchableOpacity onPress={() => setEditingTask(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                </View>
                <Calendar
                  current={selectedDate}
                  onDayPress={(day: any) => setSelectedDate(day.dateString)}
                  markedDates={{ [selectedDate]: { selected: true, selectedColor: '#2563eb' } }}
                  theme={{ todayTextColor: '#2563eb', arrowColor: '#2563eb', selectedDayBackgroundColor: '#2563eb' }}
                  style={{ borderRadius: 8, marginBottom: 16 }}
                />
                <Text style={styles.label}>Hora e Minuto (HH:mm)</Text>
                <TextInput style={styles.input} value={selectedTime} onChangeText={setSelectedTime} placeholder="Ex: 14:30" keyboardType="numbers-and-punctuation" />
                
                <View style={[styles.modalActions, { marginTop: 24 }]}>
                  {editingTask.task.due_date ? (
                    <TouchableOpacity style={styles.removeDateBtn} onPress={removeMainDate}><Ionicons name="trash" size={18} color="#ef4444" /><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Remover</Text></TouchableOpacity>
                  ) : <View style={{ flex: 1 }} />}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingTask(null)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMainDate} disabled={savingMeta}>
                      {savingMeta ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

          </View>
        </View>
      </CustomModal>

      {/* MODAL DE DATA DA SUBTAREFA */}
      <CustomModal visible={!!subtaskDateEdit} onRequestClose={() => setSubtaskDateEdit(null)}>
        <View style={styles.modalOverlayCalendar}>
          <View style={styles.modalContentCalendar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Data da Subtarefa</Text>
              <TouchableOpacity onPress={() => setSubtaskDateEdit(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle} numberOfLines={1}>{subtaskDateEdit?.subtask.title}</Text>
            
            <Calendar
              current={subSelectedDate}
              onDayPress={(day: any) => setSubSelectedDate(day.dateString)}
              markedDates={{
                [subSelectedDate]: { selected: true, selectedColor: '#2563eb' }
              }}
              theme={{
                todayTextColor: '#2563eb',
                arrowColor: '#2563eb',
                selectedDayBackgroundColor: '#2563eb',
              }}
              style={{ borderRadius: 8, marginBottom: 16 }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hora (HH:mm)</Text>
                <TextInput 
                  style={styles.input} 
                  value={subSelectedTime} 
                  onChangeText={setSubSelectedTime} 
                  placeholder="Ex: 14:30"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            
            <View style={styles.modalActionsCalendar}>
              {subtaskDateEdit?.subtask.due_date ? (
                <TouchableOpacity style={styles.removeDateBtn} onPress={removeSubtaskDate} disabled={savingSubDate}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Remover</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubtaskDateEdit(null)} disabled={savingSubDate}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSubtaskDate} disabled={savingSubDate}>
                  {savingSubDate ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </CustomModal>

    </View>
  );
}

function CategorySelectorQuick({ selectedIds, onToggle }: { selectedIds: string[], onToggle: (id: string) => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    storage.getItem<Category[]>('categories_cache').then(cached => { if (cached) setCats(cached); });
  }, []);

  if (!cats.length) return <Text style={{ color: '#6b7280' }}>Nenhuma categoria encontrada.</Text>;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {cats.map(c => {
        const isSelected = selectedIds.includes(c.id);
        return (
          <TouchableOpacity 
            key={c.id} 
            style={[styles.catBadge, { borderColor: c.color, backgroundColor: isSelected ? c.color : '#fff' }]}
            onPress={() => onToggle(c.id)}
          >
            <Text style={{ color: isSelected ? '#fff' : c.color, fontWeight: 'bold' }}>{c.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  tabTextActive: { color: '#2563eb', fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 8, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flexShrink: 1 },
  textLineThrough: { textDecorationLine: 'line-through', color: '#9ca3af' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6, backgroundColor: '#f3f4f6', borderRadius: 6 },
  cardDesc: { color: '#6b7280', fontSize: 14, marginTop: 8, marginLeft: 28 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginLeft: 28 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 28, gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#6b7280', width: 35, textAlign: 'right' },
  subtasksContainer: { marginTop: 12, marginLeft: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  subtaskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  subtaskText: { fontSize: 14, color: '#374151', marginBottom: 4 },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  subtaskDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  subtaskDateText: { fontSize: 11, color: '#2563eb' },
  empty: { textAlign: 'center', marginTop: 12, color: '#6b7280' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', maxWidth: 400 },
  modalOverlayCalendar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentCalendar: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '90%', maxWidth: 450, maxHeight: '90%' },
  modalActionsCalendar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  modalText: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  deleteBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  removeDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4, color: '#374151' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 },
  modalOptionText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});