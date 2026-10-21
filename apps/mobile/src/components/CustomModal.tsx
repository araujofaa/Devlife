import { ReactNode } from 'react';
import { Modal, Platform, View, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}

export function CustomModal({ visible, onRequestClose, children }: Props) {
  if (!visible) return null;

  // Na Web, usamos uma View absoluta sobreposta.
  // Isso evita o erro "removeChild" do React 19 com o react-native-web.
  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
        {children}
      </View>
    );
  }

  // No Mobile (iOS/Android), usamos o Modal nativo que funciona perfeitamente.
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}