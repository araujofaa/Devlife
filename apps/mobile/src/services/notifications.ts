import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '@devlife/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Notificações Push requerem um dispositivo físico.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações negada.');
    return;
  }

  // Pega o token do Expo
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "SEU_PROJECT_ID_AQUI", // Substitua pelo seu ID do EAS (ou remova se testar no Expo Go sem EAS)
  }).catch((e) => { console.log(e); return null; });

  if (tokenData?.data) {
    await apiClient.post('/users/me/device', {
      push_token: tokenData.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }
}