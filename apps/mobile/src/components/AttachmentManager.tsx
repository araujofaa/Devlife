import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@devlife/api-client';
import { storage } from '@/src/services/storage';
import { CustomModal } from './CustomModal';

interface Attachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
}

interface Props {
  taskId?: string;
  noteId?: string;
}

export function AttachmentManager({ taskId, noteId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 🆕 Estados para exclusão
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAttachments = async () => {
    try {
      const endpoint = taskId ? `/attachments/task/${taskId}` : `/attachments/note/${noteId}`;
      const res = await apiClient.get<Attachment[]>(endpoint);
      if (res.success) setAttachments(res.data ?? []);
    } catch (err) {
      console.error('Erro ao carregar anexos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId || noteId) fetchAttachments();
  }, [taskId, noteId]);

    const uploadFile = async (uri: string, name: string, mimeType: string) => {
    setUploading(true);
    try {
      const token = await storage.getToken('access_token');
      const url = `${process.env.EXPO_PUBLIC_API_URL}/attachments`;

      if (Platform.OS === 'web') {
        // Lógica da Web (continua igual)
        const formData = new FormData();
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, name);
        if (taskId) formData.append('taskId', taskId);
        if (noteId) formData.append('noteId', noteId);

        const res = await apiClient.postForm<Attachment>('/attachments', formData);
        if (res.success && res.data) setAttachments([res.data, ...attachments]);
        else Alert.alert('Erro', res.error?.message || 'Falha ao enviar arquivo');
        
        return;
      }

      // 🆕 Lógica Nativa (Mobile) usando FileSystem.uploadAsync
      const options = {
        httpMethod: 'POST' as const,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        parameters: {
          ...(taskId && { taskId }),
          ...(noteId && { noteId }),
        },
      };

      const uploadResult = await FileSystem.uploadAsync(url, uri, options);

      if (uploadResult.status === 201) {
        const parsedData = JSON.parse(uploadResult.body);
        if (parsedData.success && parsedData.data) {
          setAttachments([parsedData.data, ...attachments]);
        }
      } else {
        Alert.alert('Erro', 'Falha ao enviar arquivo para o servidor.');
        console.error('Erro no upload:', uploadResult);
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      Alert.alert('Erro', 'Erro de conexão ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

    const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // 🆕 Nova sintaxe exigida pelo Expo
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() || 'image.jpg';
      await uploadFile(asset.uri, name, asset.mimeType || 'image/jpeg');
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'A câmera não está disponível na versão Web. Use a galeria ou arquivo.');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const name = asset.uri.split('/').pop() || 'photo.jpg';
      await uploadFile(asset.uri, name, 'image/jpeg');
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/pdf');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return;
    setDeleting(true);
    try {
      const res = await apiClient.delete(`/attachments/${attachmentToDelete}`);
      if (res.success || res.error?.code === 'NOT_FOUND') {
        setAttachments(attachments.filter((a) => a.id !== attachmentToDelete));
      } else {
        Alert.alert('Erro', res.error?.message || 'Não foi possível excluir.');
      }
    } catch {
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setDeleting(false);
      setAttachmentToDelete(null);
    }
  };

  const handleOpen = async (attachment: Attachment) => {
    try {
      const token = await storage.getToken('access_token');
      const url = `${process.env.EXPO_PUBLIC_API_URL}/attachments/${attachment.id}/download`;

      if (Platform.OS === 'web') {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Falha no download');
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }

      Alert.alert('Baixando...', 'Preparando arquivo para abrir.');
      const fileUri = `${FileSystem.cacheDirectory}${attachment.filename}`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao abrir o arquivo.');
    }
  };

  if (loading) return <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Anexos</Text>
      
      {attachments.map((item) => (
        <View key={item.id} style={styles.fileRow}>
          <TouchableOpacity style={styles.fileInfo} onPress={() => handleOpen(item)}>
            <Ionicons name="document" size={20} color="#2563eb" />
            <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAttachmentToDelete(item.id)} style={{ padding: 4 }}>
            <Ionicons name="trash" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}

      {uploading ? (
        <View style={styles.uploadingBox}>
          <ActivityIndicator color="#2563eb" />
          <Text style={{ color: '#2563eb', marginLeft: 8 }}>Enviando arquivo...</Text>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.actionText}>Câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
            <Ionicons name="image" size={20} color="#fff" />
            <Text style={styles.actionText}>Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={pickDocument}>
            <Ionicons name="document-attach" size={20} color="#fff" />
            <Text style={styles.actionText}>Arquivo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Exclusão */}
      <CustomModal visible={!!attachmentToDelete} onRequestClose={() => setAttachmentToDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Excluir Anexo?</Text>
            <Text style={styles.modalText}>Essa ação não pode ser desfeita.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAttachmentToDelete(null)} disabled={deleting}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: 10, borderRadius: 6, marginBottom: 8 },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  fileName: { fontSize: 14, color: '#374151', flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', padding: 10, borderRadius: 6, gap: 4 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  uploadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#eff6ff', borderRadius: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  modalText: { fontSize: 15, color: '#6b7280', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});