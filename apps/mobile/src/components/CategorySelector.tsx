import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { apiClient } from '@devlife/api-client';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/src/services/storage'; // 🆕 Importe o storage


interface Category {
  id: string;
  name: string;
  color: string;
}

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CategorySelector({ selectedIds, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

     useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get<Category[]>('/categories');
        if (res.success && Array.isArray(res.data)) {
          setCategories(res.data);
          await storage.setItem('categories_cache', res.data);
        }
      } catch (err) {
        // Se falhar (offline), tenta carregar do cache
        const cached = await storage.getItem<Category[]>('categories_cache');
        // 🆕 Garante que 'cached' é um array antes de setar
        if (cached && Array.isArray(cached)) {
          setCategories(cached);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((cid) => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (loading) return <ActivityIndicator size="small" color="#2563eb" />;

  if (categories.length === 0) {
    return <Text style={styles.empty}>Nenhuma categoria criada na web ainda.</Text>;
  }

  return (
    <View style={styles.container}>
      {categories.map((cat) => {
        const isSelected = selectedIds.includes(cat.id);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              isSelected && { backgroundColor: cat.color, borderColor: cat.color },
            ]}
            onPress={() => toggleCategory(cat.id)}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            <Text style={[styles.chipText, isSelected && { color: '#fff' }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  chipText: { fontSize: 14, color: '#374151' },
  empty: { fontSize: 14, color: '#6b7280', fontStyle: 'italic' },
});