import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { syncService } from '@/src/services/sync';
import { apiClient } from '@devlife/api-client';
import { CategorySelector } from '@/src/components/CategorySelector';
import { RecurrenceSelector } from '@/src/components/RecurrenceSelector';
import { CustomModal } from '@/src/components/CustomModal';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

// 🌍 Configuração do Calendário em Português
LocaleConfig.locales['pt'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

export default function CreateTaskScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState(''); // Armazena em formato ISO
  
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState({ type: null as string | null, interval: 1, endDate: '' });

  // 🆕 Estados para o Modal de Data Principal
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openDateModal = () => {
    if (dueDate) {
      const d = new Date(dueDate);
      setSelectedDate(d.toISOString().split('T')[0]);
      setSelectedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('12:00');
    }
    setIsDateModalOpen(true);
  };

  const handleSaveDate = () => {
    if (!selectedDate) return;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
    setDueDate(localDate.toISOString());
    setIsDateModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        categoryIds,
        recurrence_type: recurrence.type,
        recurrence_interval: recurrence.interval,
        recurrence_end_date: recurrence.endDate ? new Date(recurrence.endDate).toISOString() : null,
      };

      const res = await apiClient.post('/tasks', payload);
      
      if (res.success) {
        await syncService.sync();
        router.back();
      } else {
        setError(res.error?.message || 'Erro ao criar tarefa');
      }
    } catch {
      setError('Erro inesperado. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Digite o título" />
      
      <Text style={styles.label}>Descrição</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Digite a descrição" multiline numberOfLines={3} textAlignVertical="top" />
      
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

      {/* 🆕 Campo de Data com Calendário */}
      <Text style={styles.label}>Data de Vencimento</Text>
      <TouchableOpacity style={styles.dateInput} onPress={openDateModal}>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar Tarefa</Text>}
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />

      {/* 🆕 Modal de Calendário Principal */}
      <CustomModal visible={isDateModalOpen} onRequestClose={() => setIsDateModalOpen(false)}>
        <View style={styles.modalOverlayCalendar}>
          <View style={styles.modalContentCalendar}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>Data e Hora</Text>
              <TouchableOpacity onPress={() => setIsDateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
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
                <Text style={styles.label}>Hora e Minuto (HH:mm)</Text>
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
              {dueDate ? (
                <TouchableOpacity style={styles.removeDateBtn} onPress={() => { setDueDate(''); setIsDateModalOpen(false); }}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Remover</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDateModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDate}>
                  <Text style={styles.saveBtnText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </CustomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
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

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: { flex: 1, backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, backgroundColor: '#e5e7eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#374151', fontWeight: 'bold' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },

  modalOverlayCalendar: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentCalendar: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '90%', maxWidth: 450, maxHeight: '90%' },
  modalActionsCalendar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  removeDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});