import test from 'node:test';
import assert from 'node:assert/strict';
import { generateIcsContent, getGoogleCalendarUrl, parseDeadlineDate, formatIcsDate } from './calendarSync';
import { checkUpcomingDeadlines } from './notifications';
import { ProjectDeadline } from '../types';

test('Calendar Sync: Formats ICS date string correctly', () => {
  const d = new Date(Date.UTC(2026, 9, 25, 14, 30, 0));
  const formatted = formatIcsDate(d);
  assert.equal(formatted, '20261025T143000Z');
});

test('Calendar Sync: Generates valid RFC 5545 iCalendar content', () => {
  const deadlines: ProjectDeadline[] = [
    {
      id: 'd-1',
      projectName: 'Casa Unifamiliar',
      title: 'Concretagem da Laje Maciça',
      description: 'Conferir escoramento e prumo antes do lançamento do concreto usinado.',
      dueDate: '2026-11-10',
      dueTime: '08:00',
      priority: 'alta',
      status: 'pendente',
      category: 'estrutural',
      reminderMinutesBefore: 1440,
    },
  ];

  const ics = generateIcsContent(deadlines);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(ics.includes('SUMMARY:Concretagem da Laje Maciça [OBra ENGEP]'));
  assert.ok(ics.includes('BEGIN:VALARM'));
  assert.ok(ics.includes('TRIGGER:-PT1440M'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

test('Calendar Sync: Generates direct Google Calendar template URL', () => {
  const deadline: ProjectDeadline = {
    id: 'd-2',
    projectName: 'Reforma Galpão',
    title: 'Inspeção de Ancoragem NR-35',
    description: 'Verificar cabos de aço e olhais com dinamômetro.',
    dueDate: '2026-11-05',
    dueTime: '10:00',
    priority: 'alta',
    status: 'pendente',
    category: 'seguranca',
    reminderMinutesBefore: 60,
  };

  const url = getGoogleCalendarUrl(deadline);
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(url.includes('NR-35'));
});

test('Notification Management: Detects due and overdue deadlines correctly', () => {
  const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 mins in future
  const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins in past

  const pad = (n: number) => n.toString().padStart(2, '0');
  const futureDueStr = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;
  const futureTimeStr = `${pad(futureDate.getHours())}:${pad(futureDate.getMinutes())}`;

  const pastDueStr = `${pastDate.getFullYear()}-${pad(pastDate.getMonth() + 1)}-${pad(pastDate.getDate())}`;
  const pastTimeStr = `${pad(pastDate.getHours())}:${pad(pastDate.getMinutes())}`;

  const deadlines: ProjectDeadline[] = [
    {
      id: 'd-due-soon',
      title: 'Tarefa Próxima',
      description: 'Lembrete ativado',
      dueDate: futureDueStr,
      dueTime: futureTimeStr,
      priority: 'alta',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 60, // 60 min window -> 30 mins is inside
    },
    {
      id: 'd-overdue',
      title: 'Tarefa Atrasada',
      description: 'Passou do prazo',
      dueDate: pastDueStr,
      dueTime: pastTimeStr,
      priority: 'media',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 60,
    },
  ];

  let notifiedItem: ProjectDeadline | null = null;
  const { dueSoon, overdue } = checkUpcomingDeadlines(deadlines, (item) => {
    notifiedItem = item;
  });

  assert.equal(dueSoon.length, 1);
  assert.equal(dueSoon[0].id, 'd-due-soon');
  assert.equal(overdue.length, 1);
  assert.equal((notifiedItem as ProjectDeadline | null)?.id, 'd-due-soon');
});
