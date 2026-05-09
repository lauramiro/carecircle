import { describe, it, expect } from 'vitest';
import { calculateStatus, summarizeChecklist } from './medication_status';
import type { ChecklistItem } from './medication_status';
 
describe('CC-68: calculateStatus', () => {
  const USER_TZ = 'America/New_York';
  const MORNING_WINDOW = {
    time_of_day: '08:00',
    window_start: '07:30',
    window_end: '08:30'
  };
 
  function createTestItem(
    overrides?: Partial<Omit<ChecklistItem, 'status'>>
  ): Omit<ChecklistItem, 'status'> {
    return {
      id: 'test-1',
      medication_id: 'med-1',
      medication_name: 'Aspirin',
      dosage: '500',
      dosage_unit: 'mg',
      time_window: MORNING_WINDOW,
      given_at: null,
      skip_reason: null,
      skip_notes: null,
      created_at: '2026-05-07T04:15:00Z', // 00:15 local
      updated_at: '2026-05-07T04:15:00Z',
      ...overrides
    };
  }
 
  describe('State: DUE', () => {
    it('returns "due" when window is open', () => {
      const item = createTestItem();
      const now = '2026-05-07T11:45:00Z'; // 07:45 local
      expect(calculateStatus(item, now, USER_TZ)).toBe('due');
    });
 
    it('returns "due" 29 minutes after window opens', () => {
      const item = createTestItem();
      const now = '2026-05-07T11:59:00Z'; // 07:59 local
      expect(calculateStatus(item, now, USER_TZ)).toBe('due');
    });
 
    it('returns "due" before window opens', () => {
      const item = createTestItem();
      const now = '2026-05-07T10:00:00Z'; // 06:00 local
      expect(calculateStatus(item, now, USER_TZ)).toBe('due');
    });
  });
 
  describe('State: OVERDUE', () => {
    it('returns "overdue" at exactly 30 minutes past', () => {
      const item = createTestItem();
      const now = '2026-05-07T12:00:00Z'; // 08:00 local (30 min after 07:30)
      expect(calculateStatus(item, now, USER_TZ)).toBe('overdue');
    });
 
    it('returns "overdue" 31 minutes past window open', () => {
      const item = createTestItem();
      const now = '2026-05-07T12:01:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('overdue');
    });
 
    it('returns "overdue" 2 hours past window open', () => {
      const item = createTestItem();
      const now = '2026-05-07T13:30:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('overdue');
    });
  });
 
  describe('State: GIVEN', () => {
    it('returns "given" when given_at is set (terminal)', () => {
      const item = createTestItem({ given_at: '2026-05-07T11:50:00Z' });
      const now = '2026-05-07T14:00:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('given');
    });
 
    it('returns "given" even if time is before window', () => {
      const item = createTestItem({ given_at: '2026-05-07T11:50:00Z' });
      const now = '2026-05-07T10:00:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('given');
    });
  });
 
  describe('State: SKIPPED', () => {
    it('returns "skipped" when skip_reason is set (terminal)', () => {
      const item = createTestItem({ skip_reason: 'refused' });
      const now = '2026-05-07T11:45:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('skipped');
    });
 
    it('returns "skipped" even if time is way past window', () => {
      const item = createTestItem({ skip_reason: 'not_available' });
      const now = '2026-05-07T20:00:00Z';
      expect(calculateStatus(item, now, USER_TZ)).toBe('skipped');
    });
  });
 
  describe('Timezone edge cases', () => {
    it('handles different timezones correctly', () => {
      const item = createTestItem();
      const now = '2026-05-07T11:45:00Z';
      const statusNY = calculateStatus(item, now, 'America/New_York');
      const statusUTC = calculateStatus(item, now, 'UTC');
      // In NY it's 07:45 (in window) → due
      // In UTC it's 11:45 (way past) → overdue
      expect(statusNY).toBe('due');
      expect(statusUTC).toBe('overdue');
    });
  });
});
 
describe('CC-73: summarizeChecklist', () => {
  it('counts items by status correctly', () => {
    const items: ChecklistItem[] = [
      { id: '1', status: 'due', medication_name: 'A', medication_id: 'm1', dosage: '100', dosage_unit: 'mg', time_window: { time_of_day: '08:00', window_start: '07:30', window_end: '08:30' }, created_at: '2026-05-07T04:15:00Z', updated_at: '2026-05-07T04:15:00Z' },
      { id: '2', status: 'due', medication_name: 'B', medication_id: 'm2', dosage: '200', dosage_unit: 'mg', time_window: { time_of_day: '08:00', window_start: '07:30', window_end: '08:30' }, created_at: '2026-05-07T04:15:00Z', updated_at: '2026-05-07T04:15:00Z' },
      { id: '3', status: 'overdue', medication_name: 'C', medication_id: 'm3', dosage: '300', dosage_unit: 'mg', time_window: { time_of_day: '08:00', window_start: '07:30', window_end: '08:30' }, created_at: '2026-05-07T04:15:00Z', updated_at: '2026-05-07T04:15:00Z' },
      { id: '4', status: 'given', medication_name: 'D', medication_id: 'm4', dosage: '400', dosage_unit: 'mg', time_window: { time_of_day: '08:00', window_start: '07:30', window_end: '08:30' }, created_at: '2026-05-07T04:15:00Z', updated_at: '2026-05-07T04:15:00Z' },
      { id: '5', status: 'skipped', medication_name: 'E', medication_id: 'm5', dosage: '500', dosage_unit: 'mg', time_window: { time_of_day: '08:00', window_start: '07:30', window_end: '08:30' }, created_at: '2026-05-07T04:15:00Z', updated_at: '2026-05-07T04:15:00Z' }
    ];
 
    const summary = summarizeChecklist(items);
 
    expect(summary.total).toBe(5);
    expect(summary.due).toBe(2);
    expect(summary.overdue).toBe(1);
    expect(summary.given).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.remaining).toBe(3); // due + overdue
  });
});
 