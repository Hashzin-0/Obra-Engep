/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Helpers for project completion progress calculation and quick period filtering
 */

import { ProjectDeadline } from '../types';

export interface ProjectProgressStats {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  percentage: number;
}

/**
 * Calculates task completion progress per active project based on 'pendente' vs 'concluido'
 */
export function calculateProjectProgress(deadlines: ProjectDeadline[]): ProjectProgressStats[] {
  if (!deadlines || deadlines.length === 0) return [];

  const map = new Map<string, { total: number; completed: number; pending: number }>();

  deadlines.forEach((d) => {
    const name = d.projectName?.trim() || 'Obra Geral';
    const entry = map.get(name) || { total: 0, completed: 0, pending: 0 };
    entry.total += 1;
    if (d.status === 'concluido') {
      entry.completed += 1;
    } else {
      entry.pending += 1;
    }
    map.set(name, entry);
  });

  return Array.from(map.entries()).map(([projectName, stats]) => {
    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return {
      projectName,
      totalTasks: stats.total,
      completedTasks: stats.completed,
      pendingTasks: stats.pending,
      percentage,
    };
  });
}

export type QuickFilterPeriod = 'todos' | 'hoje' | 'semana' | 'mes';

/**
 * Filters deadlines by quick periods (Hoje, Esta Semana, Este Mês, ou Todos)
 */
export function filterDeadlinesByPeriod(
  deadlines: ProjectDeadline[],
  period: QuickFilterPeriod,
  referenceDate: Date = new Date()
): ProjectDeadline[] {
  if (period === 'todos') return deadlines;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Start & end of today
  const todayStart = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);
  const todayEnd = new Date(refYear, refMonth, refDay, 23, 59, 59, 999);

  // Week start (Monday) and end (Sunday)
  const dayOfWeek = referenceDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(refYear, refMonth, refDay + diffToMonday, 0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Month start and end
  const startOfMonth = new Date(refYear, refMonth, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(refYear, refMonth + 1, 0, 23, 59, 59, 999);

  return deadlines.filter((item) => {
    const parts = item.dueDate.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return false;
    }
    const itemDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);

    if (period === 'hoje') {
      return itemDate >= todayStart && itemDate <= todayEnd;
    }
    if (period === 'semana') {
      return itemDate >= startOfWeek && itemDate <= endOfWeek;
    }
    if (period === 'mes') {
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    }
    return true;
  });
}
