import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '@/src/services/storage';
import { syncService } from '@/src/services/sync';

export default function EditNoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const cached = (await storage.getItem<any[]>('notes_cache')) ?? [];
      const note = cached.find((n) => n.id === id);
      if (note) {
        setTitle(note.title);
        setContent(note.content ?? '');
      } else {
        setError('Nota não encontrada no cache');
      }
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const handleUpdate = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const res = await syncService.updateNote(id, { title: title.trim(), content: content.trim() });
      if (res.success) {
        router.back();
      } else {
        setError(res.error || 'Erro ao atualizar');
      }
    } catch {
      setError('Erro inesperado');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Conteúdo</Text>
      <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} multiline numberOfLines={6} textAlignVertical="top" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={updating}>
        {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Atualizar Nota</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  contentContainer: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  textArea: { height: 150 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },
});