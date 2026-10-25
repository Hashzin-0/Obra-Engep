/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Deadline window helpers. Delivery is handled by Supabase Edge Functions + VAPID.
 */

import { ProjectDeadline } from '../types';

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
