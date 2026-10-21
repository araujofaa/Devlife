import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { syncService } from '@/src/services/sync';
import { storage } from '@/src/services/storage';
import { Ionicons } from '@expo/vector-icons';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadCache = async () => {
    const cached = (await storage.getItem<Note[]>('notes_cache')) ?? [];
    setNotes(cached);
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

  const handleDelete = (id: string) => {
    Alert.alert('Excluir nota?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => syncService.deleteNote(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/notes/create')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/notes/${item.id}/edit`)} onLongPress={() => handleDelete(item.id)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.content ? <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text> : null}
            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma nota encontrada</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, zIndex: 10 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardContent: { color: '#6b7280', marginTop: 4 },
  cardDate: { color: '#9ca3af', fontSize: 12, marginTop: 8, textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
});