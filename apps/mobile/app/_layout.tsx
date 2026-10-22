import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme, StatusBar } from 'react-native';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme(); // Detecta se o celular está no modo claro ou escuro
  const isDark = colorScheme === 'dark';

  // Escolhe o tema do react-native-paper
  const theme = isDark ? MD3DarkTheme : MD3LightTheme;

  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Slot />
      </PaperProvider>
    </AuthProvider>
  );
}