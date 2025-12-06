import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

export const useNotifications = () => {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // 1. Wenn eine Notification reinkommt (App offen)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Hier könnte man lokalen State updaten (z.B. rote Badge Zahl erhöhen)
      console.log('Notification received:', notification);
    });

    // 2. Wenn User auf Notification tippt
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Deep Linking Logik: Wenn 'leadId' dabei ist, navigiere hin
      if (data?.leadId) {
        navigation.navigate('LeadDetail', { leadId: data.leadId });
      }
    });

    return () => {
      if(notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if(responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [navigation]);
};
