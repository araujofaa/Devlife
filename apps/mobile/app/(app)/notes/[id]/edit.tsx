import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { storage } from '@/src/services/storage';
import { apiClient } from '@devlife/api-client';
import { AttachmentManager } from '@/src/components/AttachmentManager'; // 🆕 Import

export default function EditNoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === 'dark';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await apiClient.get(`/notes/${id}`);
        if (response.success) {
          setTitle(response.data.title);
          setContent(response.data.content || '');
        } else {
          setError('Nota não encontrada');
        }
      } catch {
        setError('Erro ao carregar nota');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchNote();
  }, [id]);

  const handleUpdate = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setUpdating(true);
    setError('');
    try {
      const response = await apiClient.patch(`/notes/${id}`, { title, content });
      if (response.success) {
        const cached = await storage.getItem<any[]>('notes_cache') || [];
        const idx = cached.findIndex((n) => n.id === id);
        if (idx >= 0) cached[idx] = response.data;
        await storage.setItem('notes_cache', cached);
        router.back();
      } else {
        setError(response.error?.message || 'Erro ao atualizar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.label, { color: isDark ? '#f3f4f6' : '#374151' }]}>Título *</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#374151' : '#ddd' }]} 
        value={title} 
        onChangeText={setTitle} 
      />
      
      <Text style={[styles.label, { color: isDark ? '#f3f4f6' : '#374151' }]}>Conteúdo</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#374151' : '#ddd' }]}
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={updating}>
        {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Atualizar Nota</Text>}
      </TouchableOpacity>

      {/* 🆕 Seção de Anexos para a Nota */}
      <AttachmentManager noteId={id as string} />
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 4, marginTop: 12 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  textArea: { height: 150 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },
});