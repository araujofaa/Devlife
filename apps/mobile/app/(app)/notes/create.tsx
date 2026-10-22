import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@devlife/api-client';
import { storage } from '@/src/services/storage';

export default function CreateNoteScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/notes', { title, content });
      if (response.success) {
        const cached = await storage.getItem<any[]>('notes_cache') || [];
        cached.unshift(response.data);
        await storage.setItem('notes_cache', cached);
        router.back();
      } else {
        setError(response.error?.message || 'Erro ao criar nota');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#f9fafb' }]}>
      <Text style={[styles.label, { color: isDark ? '#f3f4f6' : '#374151' }]}>Título *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#374151' : '#ddd' }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Digite o título"
        placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
      />
      
      <Text style={[styles.label, { color: isDark ? '#f3f4f6' : '#374151' }]}>Conteúdo</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#374151' : '#ddd' }]}
        value={content}
        onChangeText={setContent}
        placeholder="Digite o conteúdo"
        placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      {/* Aviso sobre anexos */}
      <View style={[styles.infoBox, { backgroundColor: isDark ? '#374151' : '#eff6ff', borderColor: isDark ? '#4b5563' : '#bfdbfe' }]}>
        <Text style={{ fontSize: 13, color: isDark ? '#d1d5db' : '#1e40af' }}>
          💡 Para adicionar anexos, salve a nota primeiro e depois clique em "Editar".
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar Nota</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 4, marginTop: 12 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  textArea: { height: 150 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },
  infoBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 8 },
});