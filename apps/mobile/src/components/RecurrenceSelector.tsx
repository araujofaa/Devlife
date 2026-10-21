import { View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Recurrence {
  type: string | null;
  interval: number;
  endDate: string;
}

interface Props {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}

export function RecurrenceSelector({ value, onChange }: Props) {
  const isEnabled = value.type !== null;

  const handleToggle = () => {
    if (isEnabled) {
      onChange({ type: null, interval: 1, endDate: '' });
    } else {
      onChange({ type: 'weekly', interval: 1, endDate: '' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="repeat" size={20} color="#2563eb" />
          <Text style={styles.headerTitle}>Tarefa Recorrente</Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={isEnabled ? '#2563eb' : '#f3f4f6'}
        />
      </View>

      {isEnabled && (
        <View style={styles.options}>
          <View style={styles.row}>
            <Text style={styles.label}>Frequência:</Text>
            {/* Usando botões no lugar do Picker para manter compatibilidade total */}
            <View style={styles.freqContainer}>
              {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                <Text
                  key={freq}
                  style={[styles.freqBtn, value.type === freq && styles.freqActive]}
                  onPress={() => onChange({ ...value, type: freq })}
                >
                  {freq === 'daily' ? 'Dias' : freq === 'weekly' ? 'Semanas' : freq === 'monthly' ? 'Meses' : 'Anos'}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Repetir a cada:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(value.interval)}
              onChangeText={(t) => onChange({ ...value, interval: parseInt(t) || 1 })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  options: { marginTop: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, color: '#4b5563' },
  freqContainer: { flexDirection: 'row', gap: 4 },
  freqBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#e5e7eb', borderRadius: 6, fontSize: 12, fontWeight: '500', overflow: 'hidden' },
  freqActive: { backgroundColor: '#2563eb', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, width: 60, textAlign: 'center', backgroundColor: '#fff' },
});