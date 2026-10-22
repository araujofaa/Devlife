import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';

interface DashboardStats {
  tasks: { done: number; pending: number; total: number };
  notes: { total: number; thisMonth: number };
  charts: {
    tasksStatus: { name: string; value: number; color: string }[];
    weeklyProgress: { day: string; created: number; completed: number }[];
    priorityDistribution: { name: string; value: number; color: string }[];
    notesPerMonth: { month: string; count: number }[];
  };
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchStats = async () => {
    try {
      const res = await apiClient.get<DashboardStats>('/stats/dashboard');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (!stats) {
    return <View style={styles.centered}><Text>Não foi possível carregar os dados.</Text></View>;
  }

  // Preparando dados para os gráficos
  const pieDataStatus = stats.charts.tasksStatus.map((item) => ({
    value: item.value,
    color: item.color,
    text: `${item.value}`,
  }));

  const pieDataPriority = stats.charts.priorityDistribution.map((item) => ({
    value: item.value,
    color: item.color,
    text: `${item.value}`,
  }));

  const barData = stats.charts.weeklyProgress.flatMap((item) => [
    { value: item.created, label: item.day, frontColor: '#3b82f6', spacing: 2 },
    { value: item.completed, frontColor: '#22c55e' },
  ]);

  const lineData = stats.charts.notesPerMonth.map((item) => ({
    value: item.count,
    label: item.month,
    dataPointText: `${item.count}`,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header de Boas-vindas */}
      <Text style={styles.welcomeTitle}>Resumo do DevLife</Text>
      <Text style={styles.welcomeSubtitle}>Aqui está o seu progresso geral.</Text>

      {/* Cards de Estatísticas */}
      <View style={styles.cardsGrid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/tasks')}>
          <Ionicons name="list" size={24} color="#3b82f6" />
          <Text style={styles.cardNumber}>{stats.tasks.total}</Text>
          <Text style={styles.cardLabel}>Total Tarefas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/tasks')}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={[styles.cardNumber, { color: '#22c55e' }]}>{stats.tasks.done}</Text>
          <Text style={styles.cardLabel}>Concluídas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/tasks')}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={[styles.cardNumber, { color: '#f59e0b' }]}>{stats.tasks.pending}</Text>
          <Text style={styles.cardLabel}>Pendentes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/notes')}>
          <Ionicons name="document-text" size={24} color="#8b5cf6" />
          <Text style={[styles.cardNumber, { color: '#8b5cf6' }]}>{stats.notes.total}</Text>
          <Text style={styles.cardLabel}>Notas</Text>
        </TouchableOpacity>
      </View>

      {/* Gráfico: Status das Tarefas */}
      {stats.tasks.total > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Status das Tarefas</Text>
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <PieChart
              data={pieDataStatus}
              donut
              showGradient
              sectionAutoFocus
              radius={80}
              innerRadius={50}
              centerLabelComponent={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#2563eb' }}>{stats.tasks.total}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Total</Text>
                </View>
              )}
            />
            <View style={styles.legendContainer}>
              {stats.charts.tasksStatus.map((item) => (
                <View key={item.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}: {item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Gráfico: Pendentes por Prioridade */}
      {stats.tasks.pending > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Pendentes por Prioridade</Text>
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <PieChart
              data={pieDataPriority}
              donut
              radius={80}
              innerRadius={50}
            />
            <View style={styles.legendContainer}>
              {stats.charts.priorityDistribution.map((item) => (
                <View key={item.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}: {item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Gráfico: Progresso Semanal */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progresso Semanal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingVertical: 20, paddingLeft: 10 }}>
            <BarChart
              data={barData}
              barWidth={22}
              noOfSections={3}
              barBorderRadius={4}
              yAxisThickness={0}
              xAxisThickness={0}
              rulesType="solid"
              rulesColor="#f3f4f6"
              yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10 }}
            />
          </View>
        </ScrollView>
        <View style={styles.legendContainerRow}>
          <View style={styles.legendItemRow}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendTextSmall}>Criadas</Text>
          </View>
          <View style={styles.legendItemRow}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendTextSmall}>Concluídas</Text>
          </View>
        </View>
      </View>

      {/* Gráfico: Notas por Mês */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Notas Criadas (6 meses)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingVertical: 20, paddingLeft: 10 }}>
            <LineChart
              data={lineData}
              color="#8b5cf6"
              thickness={3}
              dataPointsColor="#8b5cf6"
              yAxisThickness={0}
              xAxisThickness={0}
              rulesType="solid"
              rulesColor="#f3f4f6"
              yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10 }}
              areaChart
              startFillColor="rgba(139, 92, 246, 0.2)"
              endFillColor="rgba(139, 92, 246, 0.01)"
            />
          </View>
        </ScrollView>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  card: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardNumber: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginVertical: 4 },
  cardLabel: { fontSize: 14, color: '#6b7280' },

  chartContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },

  legendContainerRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTextSmall: { fontSize: 12, color: '#6b7280' },
});