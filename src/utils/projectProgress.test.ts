import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjectProgress, filterDeadlinesByPeriod } from './projectProgress';
import { ProjectDeadline } from '../types';

test('Project Progress: calculates percentage of completion accurately', () => {
  const deadlines: ProjectDeadline[] = [
    {
      id: 'd-1',
      projectName: 'Casa Unifamiliar',
      title: 'Fundação',
      description: 'Concretagem',
      dueDate: '2026-10-30',
      priority: 'alta',
      status: 'concluido',
      category: 'estrutural',
      reminderMinutesBefore: 1440,
    },
    {
      id: 'd-2',
      projectName: 'Casa Unifamiliar',
      title: 'Alvenaria',
      description: 'Levantamento de paredes',
      dueDate: '2026-11-05',
      priority: 'media',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 1440,
    },
    {
      id: 'd-3',
      projectName: 'Casa Unifamiliar',
      title: 'Telhado',
      description: 'Madeiramento',
      dueDate: '2026-11-15',
      priority: 'baixa',
      status: 'pendente',
      category: 'estrutural',
      reminderMinutesBefore: 1440,
    },
    {
      id: 'd-4',
      projectName: 'Reforma Comercial',
      title: 'Pintura',
      description: 'Lixamento e demãos',
      dueDate: '2026-10-28',
      priority: 'media',
      status: 'concluido',
      category: 'obra',
      reminderMinutesBefore: 1440,
    },
  ];

  const progress = calculateProjectProgress(deadlines);
  assert.equal(progress.length, 2);

  const casa = progress.find((p) => p.projectName === 'Casa Unifamiliar');
  assert.ok(casa);
  assert.equal(casa.totalTasks, 3);
  assert.equal(casa.completedTasks, 1);
  assert.equal(casa.pendingTasks, 2);
  assert.equal(casa.percentage, 33); // 1 / 3 = 33%

  const reforma = progress.find((p) => p.projectName === 'Reforma Comercial');
  assert.ok(reforma);
  assert.equal(reforma.totalTasks, 1);
  assert.equal(reforma.completedTasks, 1);
  assert.equal(reforma.percentage, 100);
});

test('Filter Deadlines: filters by Hoje, Esta Semana, Este Mês', () => {
  const referenceDate = new Date(2026, 9, 25); // Sunday Oct 25, 2026

  const deadlines: ProjectDeadline[] = [
    {
      id: 'd-today',
      projectName: 'Obra 1',
      title: 'Vistoria Hoje',
      description: '',
      dueDate: '2026-10-25',
      priority: 'alta',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 60,
    },
    {
      id: 'd-this-month-later',
      projectName: 'Obra 1',
      title: 'Entrega Final do Mês',
      description: '',
      dueDate: '2026-10-30',
      priority: 'media',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 60,
    },
    {
      id: 'd-next-month',
      projectName: 'Obra 2',
      title: 'Início Próximo Mês',
      description: '',
      dueDate: '2026-11-15',
      priority: 'baixa',
      status: 'pendente',
      category: 'obra',
      reminderMinutesBefore: 60,
    },
  ];

  // Test Hoje
  const todayResults = filterDeadlinesByPeriod(deadlines, 'hoje', referenceDate);
  assert.equal(todayResults.length, 1);
  assert.equal(todayResults[0].id, 'd-today');

  // Test Este Mês
  const monthResults = filterDeadlinesByPeriod(deadlines, 'mes', referenceDate);
  assert.equal(monthResults.length, 2);
  assert.ok(monthResults.some((d) => d.id === 'd-today'));
  assert.ok(monthResults.some((d) => d.id === 'd-this-month-later'));

  // Test Todos
  const allResults = filterDeadlinesByPeriod(deadlines, 'todos', referenceDate);
  assert.equal(allResults.length, 3);
});
