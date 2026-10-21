import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Configuração para traduzir o calendário para Português
LocaleConfig.locales['pt'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inicializa com a data local de hoje
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  
  const router = useRouter();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get<any>('/tasks?limit=500');
        if (res.success) {
          const tasksWithDate = res.data.tasks.filter((t: any) => t.due_date);
          setTasks(tasksWithDate);
        }
      } catch (err) {
        console.error('Erro ao buscar tarefas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Agrupa as tarefas por dia local
  const markedDates = tasks.reduce((acc: any, task) => {
    const dateKey = getLocalDateString(new Date(task.due_date));
    
    if (!acc[dateKey]) {
      acc[dateKey] = { marked: true, dots: [] };
    }
    
    const color = task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e';
    acc[dateKey].dots.push({ color });
    return acc;
  }, {});

  // 🆕 Força a marcação azul APENAS no dia selecionado
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] || {}),
    selected: true,
    selectedColor: '#2563eb',
  };

  // Filtra tarefas do dia selecionado
  const selectedTasks = tasks.filter(t => 
    getLocalDateString(new Date(t.due_date)) === selectedDate
  );

  const handleDayPress = (day: any) => {
    console.log("Dia clicado:", day.dateString); // Debug no terminal
    setSelectedDate(day.dateString);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType={'multi-dot'}
        theme={{
          todayTextColor: '#2563eb',
          todayBackgroundColor: 'transparent', // 🆕 Impede que o "Hoje" fique pintado de azul sem estar selecionado
          arrowColor: '#2563eb',
          dotColor: '#2563eb',
          selectedDayBackgroundColor: '#2563eb',
          selectedDayTextColor: '#ffffff',
        }}
        style={styles.calendar}
      />

      <View style={styles.listContainer}>
        {/* Título da data selecionada */}
        <Text style={styles.listTitle}>
          Tarefas de {selectedDate.split('-').reverse().join('/')}
        </Text>

        <FlatList
          data={selectedTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isDone = item.status === 'done';
            const timeLabel = new Date(item.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity 
                style={styles.taskCard}
                onPress={() => router.push(`/tasks/${item.id}/edit`)}
              >
                <View style={[styles.taskBar, { backgroundColor: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#eab308' : '#22c55e' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, isDone && styles.taskDone]}>{item.title}</Text>
                  <Text style={styles.taskTime}>{timeLabel}</Text>
                </View>
                <Ionicons name={isDone ? "checkmark-circle" : "ellipse-outline"} size={24} color={isDone ? "#22c55e" : "#d1d5db"} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tarefa para este dia.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendar: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  listContainer: { flex: 1, padding: 16 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
  
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  taskBar: { width: 4, height: 30, borderRadius: 2, marginRight: 12 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  taskDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskTime: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  
  emptyText: { textAlign: 'center', marginTop: 20, color: '#9ca3af', fontStyle: 'italic' },
});