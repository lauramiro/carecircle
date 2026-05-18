import type { CreateCareCircleFormValues } from '../types/createCareCircle.types';

export const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'spouse', label: 'Spouse / partner' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'professional', label: 'Professional carer' },
  { value: 'primary', label: 'Primary caregiver' },
  { value: 'other', label: 'Other' },
] as const;

export const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
] as const;

export const BLOOD_TYPE_OPTIONS = [
  '',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'unknown',
] as const;

export const CREATE_CARE_CIRCLE_DEFAULT_VALUES: CreateCareCircleFormValues = {
  groupName: '',
  groupDescription: '',
  patientFullName: '',
  dateOfBirth: '',
  gender: '',
  bloodType: '',
  patientEmail: '',
  phone: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  addressLine1: '',
  addressLine2: '',
  addressCity: '',
  addressRegion: '',
  addressPostal: '',
  addressCountry: '',
  medicalRecordNumber: '',
  insuranceProvider: '',
  insurancePolicy: '',
  insuranceGroup: '',
  allergiesText: '',
  chronicConditionsText: '',
  currentMedicationsText: '',
  careLevel: '',
  primaryPhysicianId: '',
  notes: '',
  isActive: true,
  relationship: '',
};
