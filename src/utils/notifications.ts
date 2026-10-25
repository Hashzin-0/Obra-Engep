/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Android Push Notification & Task Deadline Management System
 */

import { ProjectDeadline } from '../types';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied' };
  }
  return {
    supported: true,
    permission: Notification.permission,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Triggers an Android / Web Push notification
 */
export async function sendAndroidPushNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `obra-engep-${Date.now()}`,
    vibrate: [200, 100, 200],
    data,
  } as any;

  // Try service worker registration first for genuine Android background push support
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (e) {
      // Fallback to standard Notification
    }
  }

  try {
    new Notification(title, options);
    return true;
  } catch (e) {
    console.warn('Notification constructor fallback failed:', e);
    return false;
  }
}

/**
 * Checks pending project deadlines and calculates remaining time.
 * Triggers push notification if deadline is within reminder window and not yet notified.
 */
export function checkUpcomingDeadlines(
  deadlines: ProjectDeadline[],
  onNotify?: (deadline: ProjectDeadline) => void
): { dueSoon: ProjectDeadline[]; overdue: ProjectDeadline[] } {
  const now = new Date().getTime();
  const dueSoon: ProjectDeadline[] = [];
  const overdue: ProjectDeadline[] = [];

  deadlines.forEach((item) => {
    if (item.status === 'concluido') return;

    const [year, month, day] = item.dueDate.split('-').map(Number);
    const [hours, minutes] = (item.dueTime || '09:00').split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hours, minutes).getTime();
    const diffMs = targetDate - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMs < 0) {
      overdue.push(item);
    } else if (diffMinutes <= item.reminderMinutesBefore) {
      dueSoon.push(item);
      if (!item.notified && onNotify) {
        onNotify(item);
      }
    }
  });

  return { dueSoon, overdue };
}
