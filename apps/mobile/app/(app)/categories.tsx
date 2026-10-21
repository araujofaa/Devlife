import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/src/services/storage';
import { CustomModal } from '@/src/components/CustomModal';

interface Category {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280', '#f97316', '#10b981'];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estados do Modal de Criar/Editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Estados do Modal de Exclusão
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient.get<Category[]>('/categories');
      if (res.success) {
        setCategories(res.data || []); 
        await storage.setItem('categories_cache', res.data || []);
      } else {
        setErrorMsg(res.error?.message || 'Erro ao buscar categorias.');
      }
    } catch (err) {
      const cached = await storage.getItem<Category[]>('categories_cache');
      if (cached && Array.isArray(cached)) {
        setCategories(cached);
      } else {
        setErrorMsg('Erro de conexão e sem cache salvo.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openNewModal = () => {
    setEditingId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), color, icon: 'tag' };
      const res = editingId 
        ? await apiClient.patch(`/categories/${editingId}`, payload)
        : await apiClient.post('/categories', payload);
      
      if (res.success) {
        await fetchCategories();
        setModalVisible(false);
      } else {
        setErrorMsg(res.error?.message || 'Erro ao salvar');
      }
    } catch {
      setErrorMsg('Erro de conexão ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    
    try {
      const res = await apiClient.delete(`/categories/${categoryToDelete.id}`);
      if (res.success || res.error?.code === 'NOT_FOUND') {
        const newCats = categories.filter(c => c.id !== categoryToDelete.id);
        setCategories(newCats);
        await storage.setItem('categories_cache', newCats);
      } else {
        setErrorMsg(res.error?.message || 'Erro ao excluir categoria.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao excluir.');
    } finally {
      setDeleting(false);
      setCategoryToDelete(null);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setErrorMsg('')}>
            <Ionicons name="close" size={20} color="#b91c1c" />
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCategories(true)} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: item.color }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <Ionicons name="pricetag" size={20} color="#fff" />
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={{ padding: 8 }}>
                <Ionicons name="pencil" size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCategoryToDelete(item)} style={{ padding: 8 }}>
                <Ionicons name="trash" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="pricetags-outline" size={48} color="#d1d5db" />
            <Text style={styles.empty}>Nenhuma categoria criada.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openNewModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de Criar/Editar */}
      <CustomModal 
        visible={modalVisible} 
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</Text>
            
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Trabalho, Saúde..." autoFocus />
            
            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorSelected]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>

      {/* Modal de Exclusão */}
      <CustomModal 
        visible={!!categoryToDelete} 
        onRequestClose={() => setCategoryToDelete(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Excluir Categoria?</Text>
            <Text style={styles.alertText}>
              Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"? As tarefas associadas a ela não serão excluídas.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancelBtn} onPress={() => setCategoryToDelete(null)} disabled={deleting}>
                <Text style={styles.alertCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertDeleteBtn} onPress={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.alertDeleteText}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </CustomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, marginHorizontal: 16, marginTop: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#b91c1c', fontWeight: 'bold', flex: 1 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  cardActions: { flexDirection: 'row', gap: 4 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  empty: { textAlign: 'center', marginTop: 12, color: '#6b7280' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  colorOption: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  colorSelected: { borderWidth: 3, borderColor: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertContent: { backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '85%', maxWidth: 400 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  alertText: { fontSize: 15, color: '#6b7280', marginBottom: 24, lineHeight: 22 },
  alertActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  alertCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  alertCancelText: { color: '#6b7280', fontWeight: '600', fontSize: 16 },
  alertDeleteBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  alertDeleteText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});