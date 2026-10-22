import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { apiClient } from '@devlife/api-client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email) {
      setError('Informe seu e-mail');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error?.message || 'Erro ao solicitar recuperação');
      }
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Recuperar Senha</Text>
        
        <Text style={styles.description}>
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Se o e-mail estiver cadastrado, enviaremos um link de recuperação. Verifique sua caixa de entrada.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Voltar ao Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar link</Text>}
            </TouchableOpacity>

            <Link href="/(auth)/login" style={styles.link}>
              <Text>Lembrou a senha? Voltar ao login</Text>
            </Link>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  error: { color: 'red', textAlign: 'center', marginBottom: 12 },
  link: { marginTop: 20, textAlign: 'center' },
  successBox: { backgroundColor: '#dcfce7', padding: 16, borderRadius: 8, marginBottom: 16 },
  successText: { color: '#166534', textAlign: 'center', marginBottom: 16 },
});