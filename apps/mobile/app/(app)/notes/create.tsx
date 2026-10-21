import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { syncService } from '@/src/services/sync';

export default function CreateNoteScreen() {
  const router = useRouter();
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
      const res = await syncService.createNote({
        title: title.trim(),
        content: content.trim(),
      });
      if (res.success) {
        router.back();
      } else {
        setError(res.error || 'Erro ao criar nota');
      }
    } catch {
      setError('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Título *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Digite o título" />
      <Text style={styles.label}>Conteúdo</Text>
      <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} placeholder="Digite o conteúdo" multiline numberOfLines={6} textAlignVertical="top" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar Nota</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  textArea: { height: 150 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginTop: 8 },
});