import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMedicationForm } from './useMedicationForm';

// ---------------------------------------------------------------------------
// Scenario 1: adding a medication — all required fields must be present and
// the form must reject incomplete or invalid input before submission.
// ---------------------------------------------------------------------------

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
    expect(result.current.errors.frequency).toBe('Frequency is required');
    expect(result.current.errors.timeWindows).toBe('At least one time window must be selected');
  });

  it('validateForm returns true when all required fields are filled with valid values', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Metformin');
      result.current.updateField('dose', '500');
      result.current.updateField('unit', 'mg');
      result.current.updateField('frequency', 'twice_daily');
      result.current.toggleTimeWindow('Morning');
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

  it('toPayload formats dosage as "dose unit" and uses today as startDate', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.updateField('name', 'Amlodipine');
      result.current.updateField('dose', '5');
      result.current.updateField('unit', 'mg');
      result.current.updateField('frequency', 'once_daily');
      result.current.toggleTimeWindow('Morning');
    });

    const payload = result.current.toPayload('patient-123');

    expect(payload.patientId).toBe('patient-123');
    expect(payload.medicationName).toBe('Amlodipine');
    expect(payload.dosage).toBe('5 mg');
    expect(payload.frequency).toBe('once_daily');
    expect(payload.timeOfDay).toEqual(['Morning']);
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('toggleTimeWindow keeps time windows in canonical order (Morning → Afternoon → Evening → Night)', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.toggleTimeWindow('Night');
      result.current.toggleTimeWindow('Morning');
      result.current.toggleTimeWindow('Afternoon');
    });

    expect(result.current.values.timeWindows).toEqual(['Morning', 'Afternoon', 'Night']);
  });

  it('toggleTimeWindow removes an already-selected window when toggled again', () => {
    const { result } = renderHook(() => useMedicationForm());

    act(() => {
      result.current.toggleTimeWindow('Morning');
      result.current.toggleTimeWindow('Evening');
    });
    act(() => {
      result.current.toggleTimeWindow('Morning');
    });

    expect(result.current.values.timeWindows).toEqual(['Evening']);
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
