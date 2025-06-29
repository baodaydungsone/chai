import { Capacitor } from '@capacitor/core';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

/**
 * Checks for and requests notification permissions if needed.
 * @returns {Promise<boolean>} - True if permission is granted, false otherwise.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Notification permissions are handled by the browser on the web.");
    // For web, the browser will prompt, but we can check the status.
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  try {
    let permissions: PermissionStatus = await LocalNotifications.checkPermissions();

    if (permissions.display === 'prompt' || permissions.display === 'prompt-with-rationale') {
      permissions = await LocalNotifications.requestPermissions();
    }

    return permissions.display === 'granted';
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
};