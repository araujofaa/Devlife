import { useEffect } from 'react';
import { syncService } from '../services/sync';
import { useAuth } from '../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';

export function useSync() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Sync no boot
    syncService.sync().catch(() => {});

    // Sync ao reconectar
    const unsubNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncService.sync().catch(() => {});
    });

    // Sync periódico (60s)
    const interval = setInterval(() => {
      syncService.sync().catch(() => {});
    }, 60_000);

    return () => {
      unsubNet();
      clearInterval(interval);
    };
  }, [isAuthenticated]);
}