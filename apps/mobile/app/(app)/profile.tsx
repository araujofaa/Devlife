import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { apiClient } from '@devlife/api-client';
import { useAuth } from '@/src/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleUpdateName = async () => {
    setUpdating(true);
    setMessage('');
    try {
      const res = await apiClient.patch('/users/me/name', { name });
      if (res.success) {
        setMessage('Nome atualizado!');
        await refreshUser();
      } else {
        setMessage(res.error.message ?? 'Erro ao atualizar');
      }
    } catch {
      setMessage('Erro de conexão');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <TouchableOpacity style={styles.button} onPress={handleUpdateName} disabled={updating}>
        <Text style={styles.buttonText}>{updating ? 'Atualizando...' : 'Atualizar Nome'}</Text>
      </TouchableOpacity>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  contentContainer: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { color: '#6b7280', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  button: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  logoutButton: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  message: { color: 'green', textAlign: 'center', marginVertical: 8 },
});