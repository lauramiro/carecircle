import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMedicationForm } from './useMedicationForm';

describe('useMedicationForm — Scenario 1: adding a medication (all required fields)', () => {
  it('validateForm returns false and sets errors for every field when the form is empty', () => {
    const { result } = renderHook(() => useMedicationForm());

    let valid: boolean;
    act(() => {
      valid = result.current.validateForm();
    });

    expect(valid!).toBe(false);
    expect(result.current.errors.name).toBe('Medication name is required');
    expect(result.current.errors.dose).toBe('Dose is required');
    expect(result.current.errors.unit).toBe('Unit is required');
    expect(result.current.errors.scheduleType).toBe('Schedule is required');
  });

  it('validateForm returns true when all required fields are filled (daily specific times)', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
    });

    let valid: boolean;
    act(() => {
      valid = result.current.validateForm();
    });

    expect(valid!).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('rejects a dose of zero', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('dose', '0');
    });
    act(() => {
      result.current.touchField('dose');
    });

    expect(result.current.errors.dose).toBe('Dose must be a positive number');
  });

  it('rejects a negative dose', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('dose', '-10');
    });
    act(() => {
      result.current.touchField('dose');
    });

    expect(result.current.errors.dose).toBe('Dose must be a positive number');
  });

  it('rejects a non-numeric dose', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('dose', 'abc');
    });
    act(() => {
      result.current.touchField('dose');
    });

    expect(result.current.errors.dose).toBe('Dose must be a positive number');
  });

  it('rejects a whitespace-only medication name', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', '   ');
    });
    act(() => {
      result.current.touchField('name');
    });

    expect(result.current.errors.name).toBe('Medication name is required');
  });

  it('toPayload formats dosage as "dose unit" and includes scheduleType and specificTimes', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Amlodipine');
      result.current.updateField('dose', '5');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
    });

    const payload = result.current.toPayload('patient-123');

    expect(payload.patientId).toBe('patient-123');
    expect(payload.medicationName).toBe('Amlodipine');
    expect(payload.dosage).toBe('5 mg');
    expect(payload.scheduleType).toBe('daily');
    expect(payload.specificTimes).toEqual(['08:00']);
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('addSpecificTime keeps duplicates out of validation but allows multiple distinct times', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.addSpecificTime('18:00');
    });

    expect(result.current.values.specificTimes).toEqual(['08:00', '18:00']);
  });

  it('removeSpecificTime removes a time by index', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.addSpecificTime('18:00');
    });
    act(() => {
      result.current.removeSpecificTime(0);
    });

    expect(result.current.values.specificTimes).toEqual(['18:00']);
  });

  it('reset clears all values and errors', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Aspirin');
      result.current.updateField('dose', '100');
      result.current.validateForm();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.values.name).toBe('');
    expect(result.current.values.dose).toBe('');
    expect(result.current.errors).toEqual({});
  });
});

describe('useMedicationForm — course duration (perpetual / end date / total doses)', () => {
  it('requires exactly one course duration mode for scheduled medications', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.setCourseDurationMode('');
    });

    let valid: boolean;
    act(() => {
      valid = result.current.validateForm();
    });

    expect(valid!).toBe(false);
    expect(result.current.errors.perpetual).toContain('Choose exactly one');
  });

  it('toPayload includes perpetual flag when ongoing is selected', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.setCourseDurationMode('perpetual');
    });

    expect(result.current.toPayload('patient-1')).toMatchObject({
      perpetual: true,
      scheduleType: 'daily',
    });
  });

  it('toPayload includes endDate when fixed end date mode is selected', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.setCourseDurationMode('end_date');
      result.current.updateField('endDate', '2025-12-31');
    });

    expect(result.current.toPayload('patient-1')).toMatchObject({
      endDate: '2025-12-31',
    });
    expect(result.current.toPayload('patient-1').perpetual).toBeUndefined();
  });

  it('toPayload includes totalDoses when total planned doses mode is selected', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('startDate', '2025-01-01');
      result.current.setScheduleType('daily');
      result.current.setDailyMode('specific_times');
      result.current.addSpecificTime('08:00');
      result.current.setCourseDurationMode('total_doses');
      result.current.updateField('totalDoses', '30');
    });

    expect(result.current.toPayload('patient-1')).toMatchObject({
      totalDoses: 30,
    });
  });

  it('clears scheduleType error when a schedule is selected without stale validation', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.setScheduleType('daily');
    });

    expect(result.current.errors.scheduleType).toBeUndefined();
  });
});
