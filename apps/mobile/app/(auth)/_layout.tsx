import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function AuthLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect href="/(app)/tasks" />;
  return <Slot />;
}