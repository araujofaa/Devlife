import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '@/src/services/storage';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { CategorySelector } from '@/src/components/CategorySelector';
import { RecurrenceSelector } from '@/src/components/RecurrenceSelector';
import { CustomModal } from '@/src/components/CustomModal';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// 🌍 Configuração do Calendário em Português
LocaleConfig.locales['pt'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string | null;
}

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'done'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState({ type: null as string | null, interval: 1, endDate: '' });
  
  // Estados das Subtarefas
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // 🆕 Estados para o Modal de Data Principal (Tarefa)
  const [isMainDateModalOpen, setIsMainDateModalOpen] = useState(false);
  const [mainSelectedDate, setMainSelectedDate] = useState('');
  const [mainSelectedTime, setMainSelectedTime] = useState('');

  // Estados para o Modal de Data da Subtarefa
  const [subtaskToEditDate, setSubtaskToEditDate] = useState<Subtask | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  // Estados para Exclusão de Subtarefa
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const cached = (await storage.getItem<any[]>('tasks_cache')) ?? [];
        const task = cached.find((t) => t.id === id);
        if (task) {
          setTitle(task.title);
          setDescription(task.description ?? '');
          setPriority(task.priority);
          setStatus(task.status);
          setDueDate(task.due_date || '');
          setCategoryIds(task.categories?.map((c: any) => c.category.id) || []);
          setRecurrence({
            type: task.recurrence_type || null,
            interval: task.recurrence_interval || 1,
            endDate: task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '',
          });
        }

        const subRes = await apiClient.get(`/tasks/${id}/subtasks`);
        if (subRes.success) {
          setSubtasks(subRes.data || []);
        }
      } catch (err) {
        setError('Erro ao carregar dados da tarefa');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleUpdate = async () => {
    if (!title.trim()) { setError('O título é obrigatório'); return; }
    setUpdating(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority, status,
        due_date: dueDate || null,
        categoryIds,
        recurrence_type: recurrence.type,
        recurrence_interval: recurrence.interval,
        recurrence_end_date: recurrence.endDate ? new Date(recurrence.endDate).toISOString() : null,
      };
      const res = await apiClient.patch(`/tasks/${id}`, payload);
      if (res.success) {
        router.back();
      } else {
        setError(res.error?.message || 'Erro ao atualizar');
      }
    } catch {
      setError('Erro inesperado');
    } finally {
      setUpdating(false);
    }
  };

  // --- Lógica de Subtarefas ---
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await apiClient.post(`/tasks/${id}/subtasks`, { title: newSubtaskTitle.trim() });
      if (res.success) {
        setSubtasks([...subtasks, res.data]);
        setNewSubtaskTitle('');
      }
    } catch { 
      setError('Não foi possível adicionar subtarefa.'); 
    }
  };

  const handleToggleSubtask = async (subId: string, currentCompleted: boolean) => {
    setSubtasks(subtasks.map(s => s.id === subId ? { ...s, completed: !currentCompleted } : s));
    try {
      await apiClient.patch(`/tasks/${id}/subtasks/${subId}`, { completed: !currentCompleted });
    } catch { 
      setSubtasks(subtasks.map(s => s.id === subId ? { ...s, completed: currentCompleted } : s)); 
    }
  };

  const handleSaveSubtaskTitle = async (subId: string) => {
    if (!editingSubtaskTitle.trim()) { setEditingSubtaskId(null); return; }
    const oldTitle = subtasks.find(s => s.id === subId)?.title;
    setSubtasks(subtasks.map(s => s.id === subId ? { ...s, title: editingSubtaskTitle.trim() } : s));
    setEditingSubtaskId(null);
    try {
      await apiClient.patch(`/tasks/${id}/subtasks/${subId}`, { title: editingSubtaskTitle.trim() });
    } catch { 
      setSubtasks(subtasks.map(s => s.id === subId ? { ...s, title: oldTitle || '' } : s));
      setError('Erro ao salvar a edição da subtarefa.'); 
    }
  };

  const handleConfirmDeleteSubtask = async () => {
    if (!subtaskToDelete) return;
    setDeletingSub(true);
    const newSubs = subtasks.filter(s => s.id !== subtaskToDelete);
    setSubtasks(newSubs);
    try {
      await apiClient.delete(`/tasks/${id}/subtasks/${subtaskToDelete}`);
    } catch (err) {
      console.warn('Erro ao deletar subtarefa:', err);
    } finally {
      setDeletingSub(false);
      setSubtaskToDelete(null);
    }
  };

  // 🆕 Lógica do Modal de Data Principal
  const openMainDateModal = () => {
    if (dueDate) {
      const d = new Date(dueDate);
      setMainSelectedDate(d.toISOString().split('T')[0]);
      setMainSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setMainSelectedDate(new Date().toISOString().split('T')[0]);
      setMainSelectedTime('12:00');
    }
    setIsMainDateModalOpen(true);
  };

  const handleSaveMainDate = () => {
    if (!mainSelectedDate) return;
    const [year, month, day] = mainSelectedDate.split('-').map(Number);
    const [hours, minutes] = mainSelectedTime.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
    setDueDate(localDate.toISOString());
    setIsMainDateModalOpen(false);
  };

  // --- Lógica de Data da Subtarefa ---
  const openSubtaskDateEditor = (sub: Subtask) => {
    setSubtaskToEditDate(sub);
    if (sub.due_date) {
      const d = new Date(sub.due_date);
      setSelectedDate(d.toISOString().split('T')[0]);
      setSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('12:00');
    }
  };

  const handleSaveSubtaskDate = async () => {
    if (!subtaskToEditDate || !selectedDate) return;
    setSavingDate(true);
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
      const isoDate = localDate.toISOString();

      setSubtasks(subtasks.map(s => 
        s.id === subtaskToEditDate.id ? { ...s, due_date: isoDate } : s
      ));
      
      await apiClient.patch(`/tasks/${id}/subtasks/${subtaskToEditDate.id}`, { due_date: isoDate });
      setSubtaskToEditDate(null);
    } catch {
      setError('Erro ao atualizar data da subtarefa.');
    } finally {
      setSavingDate(false);
    }
  };

  const removeSubtaskDate = async () => {
    if (!subtaskToEditDate) return;
    setSavingDate(true);
    setSubtasks(subtasks.map(s => s.id === subtaskToEditDate.id ? { ...s, due_date: null } : s));
    try {
      await apiClient.patch(`/tasks/${id}/subtasks/${subtaskToEditDate.id}`, { due_date: null });
      setSubtaskToEditDate(null);
    } catch {
      setError('Erro ao remover data.');
    } finally {
      setSavingDate(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      
      <Text style={styles.label}>Descrição</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
      
      <Text style={styles.label}>Prioridade</Text>
      <View style={styles.row}>
        {(['low', 'medium', 'high'] as const).map((p) => (
          <TouchableOpacity key={p} style={[styles.option, priority === p && styles.optionSelected]} onPress={() => setPriority(p)}>
            <Text style={[styles.optionText, priority === p && { color: '#fff' }]}>
              {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Status</Text>
      <View style={styles.row}>
        {(['pending', 'done'] as const).map((s) => (
          <TouchableOpacity key={s} style={[styles.option, status === s && styles.optionSelected]} onPress={() => setStatus(s)}>
            <Text style={[styles.optionText, status === s && { color: '#fff' }]}>
              {s === 'pending' ? 'Pendente' : 'Concluída'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🆕 Campo de Data com Calendário */}
      <Text style={styles.label}>Data de Vencimento</Text>
      <TouchableOpacity style={styles.dateInput} onPress={openMainDateModal}>
        <Ionicons name="calendar-outline" size={20} color="#2563eb" />
        <Text style={dueDate ? styles.dateTextValue : styles.dateTextPlaceholder}>
          {dueDate 
            ? new Date(dueDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Selecionar data e hora'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Categorias</Text>
      <CategorySelector selectedIds={categoryIds} onChange={setCategoryIds} />

      <RecurrenceSelector value={recurrence} onChange={setRecurrence} />

      <View style={styles.subtaskSection}>
        <Text style={styles.subtaskTitle}>Subtarefas</Text>
        
        {subtasks.map(sub => {
          const isOverdue = sub.due_date && !sub.completed && new Date(sub.due_date) < new Date();
          
          return (
            <View key={sub.id} style={styles.subtaskItem}>
              <TouchableOpacity onPress={() => handleToggleSubtask(sub.id, sub.completed)} style={styles.subtaskCheckbox}>
                <Ionicons name={sub.completed ? "checkbox" : "square-outline"} size={22} color={sub.completed ? "#22c55e" : "#6b7280"} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                {editingSubtaskId === sub.id ? (
                  <TextInput
                    style={[styles.input, { marginBottom: 4, paddingVertical: 6 }]}
                    value={editingSubtaskTitle}
                    onChangeText={setEditingSubtaskTitle}
                    autoFocus
                    onBlur={() => handleSaveSubtaskTitle(sub.id)}
                    onSubmitEditing={() => handleSaveSubtaskTitle(sub.id)}
                  />
                ) : (
                  <Text style={[styles.subtaskText, sub.completed && styles.subtaskDone]}>{sub.title}</Text>
                )}

                <TouchableOpacity onPress={() => openSubtaskDateEditor(sub)} style={styles.dateButton}>
                  <Ionicons name="calendar-outline" size={14} color={isOverdue ? '#ef4444' : '#2563eb'} />
                  <Text style={[styles.dateText, isOverdue && { color: '#ef4444', fontWeight: 'bold' }]}>
                    {sub.due_date 
                      ? `${isOverdue ? 'Atrasada: ' : 'Vence: '}${new Date(sub.due_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                      : 'Adicionar data'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.subtaskActions}>
                <TouchableOpacity onPress={() => { setEditingSubtaskId(sub.id); setEditingSubtaskTitle(sub.title); }} style={{ padding: 4 }}>
                  <Ionicons name="pencil" size={18} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSubtaskToDelete(sub.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={styles.addSubtaskRow}>
          <TextInput 
            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
            placeholder="Nova subtarefa..." 
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            onSubmitEditing={handleAddSubtask}
          />
          <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtask}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={updating}>
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Atualizar</Text>}
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />

      {/* 🆕 Modal de Calendário Principal */}
      <CustomModal visible={isMainDateModalOpen} onRequestClose={() => setIsMainDateModalOpen(false)}>
        <View style={styles.modalOverlayCalendar}>
          <View style={styles.modalContentCalendar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Data e Hora</Text>
              <TouchableOpacity onPress={() => setIsMainDateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Calendar
              current={mainSelectedDate}
              onDayPress={(day: any) => setMainSelectedDate(day.dateString)}
              markedDates={{
                [mainSelectedDate]: { selected: true, selectedColor: '#2563eb' }
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
                <Text style={styles.label}>Hora e Minuto (HH:mm)</Text>
                <TextInput 
                  style={styles.input} 
                  value={mainSelectedTime} 
                  onChangeText={setMainSelectedTime} 
                  placeholder="Ex: 14:30"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            
            <View style={styles.modalActionsCalendar}>
              {dueDate ? (
                <TouchableOpacity style={styles.removeDateBtn} onPress={() => { setDueDate(''); setIsMainDateModalOpen(false); }}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Remover</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsMainDateModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMainDate}>
                  <Text style={styles.saveBtnText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </CustomModal>

      {/* Modal de Calendário da Subtarefa (Mantido) */}
      <CustomModal visible={!!subtaskToEditDate} onRequestClose={() => setSubtaskToEditDate(null)}>
        <View style={styles.modalOverlayCalendar}>
          <View style={styles.modalContentCalendar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Data da Subtarefa</Text>
              <TouchableOpacity onPress={() => setSubtaskToEditDate(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle} numberOfLines={1}>{subtaskToEditDate?.title}</Text>
            
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#2563eb' }
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
                  value={selectedTime} 
                  onChangeText={setSelectedTime} 
                  placeholder="Ex: 14:30"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            
            <View style={styles.modalActionsCalendar}>
              {subtaskToEditDate?.due_date ? (
                <TouchableOpacity style={styles.removeDateBtn} onPress={removeSubtaskDate} disabled={savingDate}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Remover</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubtaskToEditDate(null)} disabled={savingDate}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSubtaskDate} disabled={savingDate}>
                  {savingDate ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </CustomModal>

      {/* Modal de Exclusão de Subtarefa (Mantido) */}
      <CustomModal visible={!!subtaskToDelete} onRequestClose={() => setSubtaskToDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Subtarefa?</Text>
            <Text style={styles.modalText}>Essa ação não pode ser desfeita.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubtaskToDelete(null)} disabled={deletingSub}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleConfirmDeleteSubtask} disabled={deletingSub}>
                {deletingSub ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4, marginTop: 12, color: '#374151' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  option: { flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#e5e7eb', alignItems: 'center' },
  optionSelected: { backgroundColor: '#2563eb' },
  optionText: { color: '#374151', fontWeight: '500' },
  
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  dateTextValue: { fontSize: 15, color: '#111827' },
  dateTextPlaceholder: { fontSize: 15, color: '#9ca3af' },

  subtaskSection: { marginTop: 24, backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  subtaskTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  subtaskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 8 },
  subtaskCheckbox: { padding: 2, marginTop: 2 },
  subtaskText: { fontSize: 15, color: '#374151', marginBottom: 4 },
  subtaskDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  dateText: { fontSize: 12, color: '#2563eb' },
  subtaskActions: { flexDirection: 'row', gap: 4, marginTop: 2 },
  addSubtaskRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  addSubtaskBtn: { backgroundColor: '#2563eb', width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, backgroundColor: '#e5e7eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontWeight: 'bold' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', maxWidth: 400 },
  modalOverlayCalendar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentCalendar: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '90%', maxWidth: 450, maxHeight: '90%' },
  modalActionsCalendar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  modalText: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  removeDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});