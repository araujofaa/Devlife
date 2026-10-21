import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSync } from '@/src/hooks/useSync';

export default function AppLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  useSync();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#fff',
        headerRight: () => (
          <Ionicons
            name="log-out-outline"
            size={24}
            color="#fff"
            style={{ marginRight: 16 }}
            onPress={logout}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks/index"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      {/* 🆕 Calendário */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      {/* 🆕 Categorias */}
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categorias',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetags" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes/index"
        options={{
          title: 'Notas',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* Esconde as rotas de criar/editar do menu inferior */}
      <Tabs.Screen name="tasks/create" options={{ href: null }} />
      <Tabs.Screen name="tasks/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="notes/create" options={{ href: null }} />
      <Tabs.Screen name="notes/[id]/edit" options={{ href: null }} />
    </Tabs>
  );
}