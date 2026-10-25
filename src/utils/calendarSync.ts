/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calendar synchronization utility (RFC 5545 iCalendar & Google Calendar)
 */

import { ProjectDeadline } from '../types';

/**
 * Format Date to UTC iCalendar format: YYYYMMDDTHHmmSSZ
 */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Parses dueDate (YYYY-MM-DD) and dueTime (HH:mm) into a Date object
 */
export function parseDeadlineDate(dueDate: string, dueTime: string = '09:00'): { start: Date; end: Date } {
  const [year, month, day] = dueDate.split('-').map(Number);
  const [hours, minutes] = dueTime.split(':').map(Number);

  const start = new Date(year, month - 1, day, hours || 9, minutes || 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration default
  return { start, end };
}

/**
 * Generates an RFC 5545 .ics iCalendar string for one or multiple project deadlines/milestones.
 * Compatible with Android Calendar, Google Calendar, iOS Calendar, and Outlook.
 */
export function generateIcsContent(deadlines: ProjectDeadline[], calendarName: string = 'OBra ENGEP Prazos'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OBra ENGEP//Manual Tecnico Inteligente//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  deadlines.forEach((item) => {
    const { start, end } = parseDeadlineDate(item.dueDate, item.dueTime || '09:00');
    const nowStr = formatIcsDate(new Date());
    const startStr = formatIcsDate(start);
    const endStr = formatIcsDate(end);
    const cleanUid = `obra-engep-${item.id}-${start.getTime()}@obraengep.app`;
    const cleanTitle = (item.title || 'Prazo OBra ENGEP').replace(/[,;\\]/g, ' ');
    const cleanDesc = (
      `${item.description || ''}\n\nProjeto: ${item.projectName || 'Geral'}\nPrioridade: ${item.priority.toUpperCase()}\nCategoria: ${item.category}\nAviso: Consulte normas vigentes e ART/CREA.`
    ).replace(/\n/g, '\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${cleanUid}`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${cleanTitle} [OBra ENGEP]`);
    lines.push(`DESCRIPTION:${cleanDesc}`);
    lines.push('STATUS:CONFIRMED');
    lines.push(`PRIORITY:${item.priority === 'alta' ? '1' : item.priority === 'media' ? '5' : '9'}`);
    
    // Alarm 1: 1 day before (1440 min)
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT1440M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Lembrete de Prazo OBra ENGEP: ${cleanTitle}`);
    lines.push('END:VALARM');

    // Alarm 2: 2 hours before (120 min)
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT120M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Lembrete Imediato OBra ENGEP: ${cleanTitle}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads a .ics file to user's device or uses Web Share API on mobile
 */
export async function exportToLocalCalendar(
  deadlines: ProjectDeadline[],
  filename: string = 'OBra_ENGEP_Prazos.ics'
): Promise<boolean> {
  if (!deadlines || deadlines.length === 0) return false;

  const icsData = generateIcsContent(deadlines);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });

  // On modern Android browsers, attempt native file sharing to open directly in the Calendar app
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'text/calendar' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Sincronizar com Calendário',
          text: 'Prazos e marcos de projetos exportados do OBra ENGEP.',
        });
        return true;
      }
    } catch (e) {
      // Fallback to standard download
    }
  }

  // Standard download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Generates direct Google Calendar Web intent URL
 */
export function getGoogleCalendarUrl(deadline: ProjectDeadline): string {
  const { start, end } = parseDeadlineDate(deadline.dueDate, deadline.dueTime || '09:00');
  const startStr = formatIcsDate(start);
  const endStr = formatIcsDate(end);

  const text = encodeURIComponent(`${deadline.title} [OBra ENGEP]`);
  const details = encodeURIComponent(
    `${deadline.description}\n\nProjeto: ${deadline.projectName || 'Geral'}\nPrioridade: ${deadline.priority}\nCategoria: ${deadline.category}\nGerado pelo aplicativo OBra ENGEP.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startStr}/${endStr}&details=${details}`;
}
