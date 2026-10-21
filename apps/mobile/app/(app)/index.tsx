import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { apiClient } from '@devlife/api-client';
import { useAuth } from '@/src/contexts/AuthContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, notes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tasksRes, notesRes] = await Promise.all([
          apiClient.get<any>('/tasks?limit=1'),
          apiClient.get<any>('/notes?limit=1'),
        ]);
        setStats({
          tasks: tasksRes.success ? tasksRes.data.total ?? 0 : 0,
          notes: notesRes.success ? notesRes.data.total ?? 0 : 0,
        });
      } catch {
        /* silencioso */
      }
    };
    fetchStats();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcome}>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.tasks}</Text>
          <Text style={styles.statLabel}>Tarefas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.notes}</Text>
          <Text style={styles.statLabel}>Notas</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/tasks/create')}>
        <Text style={styles.quickActionText}>➕ Nova Tarefa</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/notes/create')}>
        <Text style={styles.quickActionText}>📝 Nova Nota</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  welcome: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#6b7280', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, flex: 0.45, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' },
  statLabel: { color: '#6b7280' },
  quickAction: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  quickActionText: { fontSize: 16, fontWeight: '500' },
});