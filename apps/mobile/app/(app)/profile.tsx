import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@devlife/api-client';
import { useAuth } from '@/src/contexts/AuthContext';
import { CustomModal } from '@/src/components/CustomModal';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  // Estados - Dados Básicos
  const [name, setName] = useState(user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  
  // Estados - Configurações
  const [reminderOffset, setReminderOffset] = useState(user?.reminder_offset_hours ?? 24);
  
  // Estados - Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados - Feedback
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados - Modais
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phone_number || '');
      setReminderOffset(user.reminder_offset_hours || 24);
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000); // Some após 5s
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) return showMessage('error', 'O nome não pode ficar vazio.');
    
    setLoading(true);
    try {
      // 1. Atualiza o nome
      await apiClient.patch('/users/me/name', { name: name.trim() });
      
      // 2. Atualiza o telefone (se houver)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone) {
        if (cleanPhone.length < 10) {
          showMessage('error', 'Telefone inválido. Use DDI + DDD + Número.');
          setLoading(false);
          return;
        }
        await apiClient.patch('/users/me/phone', { phone_number: cleanPhone });
      } else {
        // Se o campo estiver vazio, remove o telefone (se ele existia antes)
        if (user?.phone_number) {
          await apiClient.delete('/users/me/phone');
        }
      }

      // 3. Atualiza as configurações de lembrete
      await apiClient.patch('/users/me/settings', { reminder_offset_hours: reminderOffset });

      await refreshUser(); // Atualiza os dados no Contexto
      showMessage('success', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return showMessage('error', 'Preencha todos os campos de senha.');
    }
    if (newPassword !== confirmPassword) {
      return showMessage('error', 'As novas senhas não coincidem.');
    }
    if (newPassword.length < 6) {
      return showMessage('error', 'A nova senha deve ter no mínimo 6 caracteres.');
    }

    setLoading(true);
    try {
      await apiClient.patch('/users/me/password', { currentPassword, newPassword });
      showMessage('success', 'Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiClient.delete('/users/me');
      await logout(); // Desloga e limpa o token local
      router.replace('/(auth)/login');
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir conta.');
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  if (!user) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* Feedback Global */}
      {message.text ? (
        <View style={[styles.messageBox, message.type === 'error' ? styles.messageError : styles.messageSuccess]}>
          <Text style={[styles.messageText, message.type === 'error' ? { color: '#b91c1c' } : { color: '#166534' }]}>
            {message.text}
          </Text>
        </View>
      ) : null}

      {/* Seção 1: Dados Principais */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dados Pessoais</Text>
        <Text style={styles.email}>{user.email}</Text>
        
        <Text style={styles.label}>Nome completo</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" />
      </View>

      {/* Seção 2: WhatsApp */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="logo-whatsapp" size={24} color="#22c55e" />
          <Text style={styles.sectionTitle}>Notificações no WhatsApp</Text>
        </View>
        <Text style={styles.helperText}>Receba lembretes de tarefas diretamente no seu WhatsApp.</Text>
        
        <Text style={styles.label}>Número de telefone (ex: 5511999999999)</Text>
        <TextInput 
          style={styles.input} 
          value={phoneNumber} 
          onChangeText={setPhoneNumber} 
          placeholder="DDI + DDD + Número"
          keyboardType="phone-pad"
        />
      </View>

      {/* Seção 3: Configurações de Lembrete */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Antecedência dos Lembretes</Text>
        <Text style={styles.helperText}>Com quanto tempo de antecedência deseja ser avisado?</Text>
        
        <View style={styles.optionsRow}>
          {[6, 12, 24, 48].map((hours) => (
            <TouchableOpacity 
              key={hours}
              style={[styles.optionBtn, reminderOffset === hours && styles.optionBtnActive]}
              onPress={() => setReminderOffset(hours)}
            >
              <Text style={[styles.optionText, reminderOffset === hours && { color: '#fff' }]}>
                {hours}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Botão para salvar todas as configurações acima */}
      <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateProfile} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Salvar Alterações</Text>}
      </TouchableOpacity>

      {/* Seção 4: Segurança (Senha) */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Segurança</Text>
        
        <Text style={styles.label}>Senha Atual</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        
        <Text style={styles.label}>Nova Senha</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        
        <Text style={styles.label}>Confirmar Nova Senha</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#2563eb" /> : <Text style={styles.secondaryButtonText}>Alterar Senha</Text>}
        </TouchableOpacity>
      </View>

      {/* Seção 5: Zona de Perigo */}
      <View style={[styles.card, { borderColor: '#fecaca', backgroundColor: '#fef2f2', marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: '#b91c1c' }]}>Zona de Perigo</Text>
        <Text style={[styles.helperText, { color: '#7f1d1d' }]}>
          Ao excluir sua conta, todas as suas tarefas, notas e anexos serão removidos permanentemente.
        </Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={() => setDeleteModalVisible(true)}>
          <Text style={styles.dangerButtonText}>Excluir Minha Conta</Text>
        </TouchableOpacity>
      </View>

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* Modal de Exclusão de Conta */}
      <CustomModal visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Conta?</Text>
            <Text style={styles.modalText}>Esta ação é irreversível. Todos os seus dados serão apagados para sempre.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)} disabled={deleting}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Excluir Conta</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15 },
  helperText: { fontSize: 13, color: '#6b7280', marginBottom: 8 },

  optionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  optionBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  optionBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#4b5563' },

  primaryButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  secondaryButton: { backgroundColor: '#eff6ff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryButtonText: { color: '#2563eb', fontWeight: 'bold', fontSize: 15 },

  dangerButton: { backgroundColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  dangerButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: 16 },
  logoutButtonText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },

  messageBox: { padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1 },
  messageSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  messageError: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  messageText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalText: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});