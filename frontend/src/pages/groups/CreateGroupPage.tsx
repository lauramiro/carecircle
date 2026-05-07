import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as date from 'date-fns';
import RequiredMark from '@components/ui/RequiredMark';
import {
  BLOOD_TYPE_OPTIONS,
  CREATE_CARE_CIRCLE_DEFAULT_VALUES,
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from '@constants/createCareCircle.constants';
import { supabase } from '@lib/supabaseClient';
import type { CreateCareCircleFormValues } from '@typings/createCareCircle.types';
import { parseCommaSeparatedList, pickDefinedStrings } from '@utils/createCareCircleForm';

export type { CreateCareCircleFormValues } from '@typings/createCareCircle.types';

export default function CreateGroupPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<CreateCareCircleFormValues>({
    defaultValues: CREATE_CARE_CIRCLE_DEFAULT_VALUES,
  });

  const groupNameField = register('groupName', {
    required: 'Group name is required.',
    minLength: { value: 3, message: 'Group name must be at least 3 characters.' },
  });
  const patientFullNameField = register('patientFullName', {
    required: "Patient's full name is required.",
    minLength: { value: 2, message: 'Name must be at least 2 characters.' },
  });
  const dateOfBirthField = register('dateOfBirth', {
    required: 'Date of birth is required.',
    validate: value => {
      const dob = date.parse(value, 'yyyy-MM-dd', new Date());
      if (!date.isValid(dob)) {
        return 'Enter a valid date of birth.';
      }
      if (date.isAfter(dob, date.endOfDay(new Date()))) {
        return 'Date of birth cannot be in the future.';
      }
      return true;
    },
  });
  const relationshipField = register('relationship', {
    validate: v => v !== '' || 'Select your relationship to the patient.',
  });

  const onSubmit = async (data: CreateCareCircleFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const patientInsert: Record<string, unknown> = {
        full_name: data.patientFullName.trim(),
        date_of_birth: data.dateOfBirth,
        primary_caregiver_id: user.id,
        is_active: data.isActive,
      };

      const uid = data.userId.trim();
      if (uid) patientInsert.user_id = uid;

      if (data.gender) patientInsert.gender = data.gender;

      const bt = data.bloodType.trim();
      if (bt) patientInsert.blood_type = bt;

      const em = data.patientEmail.trim();
      if (em) patientInsert.email = em;

      const ph = data.phone.trim();
      if (ph) patientInsert.phone = ph;

      const emergency = pickDefinedStrings({
        name: data.emergencyName,
        phone: data.emergencyPhone,
        relationship: data.emergencyRelationship,
      });
      if (emergency) patientInsert.emergency_contact = emergency;

      const address = pickDefinedStrings({
        line1: data.addressLine1,
        line2: data.addressLine2,
        city: data.addressCity,
        region: data.addressRegion,
        postal_code: data.addressPostal,
        country: data.addressCountry,
      });
      if (address) patientInsert.address = address;

      const mrn = data.medicalRecordNumber.trim();
      if (mrn) patientInsert.medical_record_number = mrn;

      const insurance = pickDefinedStrings({
        provider: data.insuranceProvider,
        policy_number: data.insurancePolicy,
        group_number: data.insuranceGroup,
      });
      if (insurance) patientInsert.insurance_info = insurance;

      const allergies = parseCommaSeparatedList(data.allergiesText);
      if (allergies) patientInsert.allergies = allergies;

      const chronic = parseCommaSeparatedList(data.chronicConditionsText);
      if (chronic) patientInsert.chronic_conditions = chronic;

      const meds = parseCommaSeparatedList(data.currentMedicationsText);
      if (meds) patientInsert.current_medications = meds;

      const cl = data.careLevel.trim();
      if (cl) patientInsert.care_level = cl;

      const ppi = data.primaryPhysicianId.trim();
      if (ppi) patientInsert.primary_physician_id = ppi;

      const n = data.notes.trim();
      if (n) patientInsert.notes = n;

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert(patientInsert)
        .select('id')
        .single();

      if (patientError) throw patientError;

      const groupNameTrimmed = data.groupName.trim();
      const descriptionTrimmed = data.groupDescription.trim();

      const { data: careGroup, error: groupError } = await supabase
        .from('care_group')
        .insert({
          name: groupNameTrimmed,
          ...(descriptionTrimmed ? { description: descriptionTrimmed } : {}),
          patient_id: patient.id,
          primary_carer_id: user.id,
        })
        .select('id')
        .single();

      if (groupError) throw groupError;
      if (!careGroup?.id) throw new Error('Care group was not created.');

      const { error: careGiverError } = await supabase.from('care_givers').insert({
        group_id: careGroup.id,
        patient_id: patient.id,
        care_giver_id: user.id,
        relationship: data.relationship,
        role_in_care: 'Primary Carer',
        can_view_medical: true,
        can_schedule: true,
        can_communicate: true,
        status: 'active',
        joined_at: date.formatISO(new Date()),
      });

      if (careGiverError) throw careGiverError;

      toast.success(`"${groupNameTrimmed}" care circle created!`);
      navigate('/groups/list');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'Something went wrong. Please try again.';
      toast.error(message);
    }
    setLoading(false);
  };

  const inputBorder = (err: string | undefined) =>
    err ? 'var(--color-status-critical)' : 'var(--color-border)';

  return (
    <section>
      <div className="mb-6">
        <h1
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Create a Care Circle
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Name your circle and enter patient details. Only fields marked with a red asterisk are
          required.
        </p>
      </div>

      <form
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: 'var(--color-border)', maxWidth: '640px' }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Care circle
        </p>
        <div className="mb-5">
          <label
            htmlFor="groupName"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Circle name
          </label>
          <input
            id="groupName"
            type="text"
            autoComplete="off"
            {...groupNameField}
            onChange={e => {
              groupNameField.onChange(e);
              clearErrors('groupName');
            }}
            placeholder="e.g. Mum's Care Team"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(errors.groupName?.message),
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.groupName && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {errors.groupName.message}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="groupDescription"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Circle description <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="groupDescription"
            {...register('groupDescription')}
            placeholder="Short note about this care circle, visible to members"
            rows={3}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <p className="mb-4 mt-8 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Patient record
        </p>

        <div className="mb-5">
          <label
            htmlFor="patientFullName"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Patient full name
            <RequiredMark />
          </label>
          <input
            id="patientFullName"
            type="text"
            {...patientFullNameField}
            onChange={e => {
              patientFullNameField.onChange(e);
              clearErrors('patientFullName');
            }}
            placeholder="Legal name as used for care records"
            autoComplete="name"
            aria-required="true"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(errors.patientFullName?.message),
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.patientFullName && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {errors.patientFullName.message}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="dateOfBirth"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Date of birth
            <RequiredMark />
          </label>
          <input
            id="dateOfBirth"
            type="date"
            {...dateOfBirthField}
            onChange={e => {
              dateOfBirthField.onChange(e);
              clearErrors('dateOfBirth');
            }}
            aria-required="true"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(errors.dateOfBirth?.message),
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.dateOfBirth && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="userId" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Linked user ID
          </label>
          <input
            id="userId"
            type="text"
            {...register('userId')}
            placeholder="Auth user UUID if the patient has an account"
            className="mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gender" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Gender
            </label>
            <select
              id="gender"
              {...register('gender')}
              className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {GENDER_OPTIONS.map(opt => (
                <option key={opt.value || 'unspecified'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bloodType" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Blood type
            </label>
            <select
              id="bloodType"
              {...register('bloodType')}
              className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            >
              {BLOOD_TYPE_OPTIONS.map(opt => (
                <option key={opt || 'empty'} value={opt}>
                  {opt === '' ? 'Not specified' : opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patientEmail" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Email
            </label>
            <input
              id="patientEmail"
              type="email"
              {...register('patientEmail')}
              placeholder="name@example.com"
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="phone" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="Contact number"
              autoComplete="tel"
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <p className="mb-3 mt-6 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          Emergency contact
        </p>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="emergencyName" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Name
            </label>
            <input
              id="emergencyName"
              type="text"
              {...register('emergencyName')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="emergencyPhone" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Phone
            </label>
            <input
              id="emergencyPhone"
              type="tel"
              {...register('emergencyPhone')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="emergencyRelationship" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Relationship to patient
            </label>
            <input
              id="emergencyRelationship"
              type="text"
              {...register('emergencyRelationship')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <p className="mb-3 mt-6 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          Address
        </p>
        <div className="mb-3">
          <label htmlFor="addressLine1" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Line 1
          </label>
          <input
            id="addressLine1"
            type="text"
            {...register('addressLine1')}
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="addressLine2" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Line 2
          </label>
          <input
            id="addressLine2"
            type="text"
            {...register('addressLine2')}
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="addressCity" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              City
            </label>
            <input
              id="addressCity"
              type="text"
              {...register('addressCity')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="addressRegion" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Region / state
            </label>
            <input
              id="addressRegion"
              type="text"
              {...register('addressRegion')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="addressPostal" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Postal code
            </label>
            <input
              id="addressPostal"
              type="text"
              {...register('addressPostal')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="addressCountry" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Country
            </label>
            <input
              id="addressCountry"
              type="text"
              {...register('addressCountry')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="medicalRecordNumber" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Medical record number
          </label>
          <input
            id="medicalRecordNumber"
            type="text"
            {...register('medicalRecordNumber')}
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <p className="mb-3 mt-6 text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
          Insurance
        </p>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="insuranceProvider" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Provider
            </label>
            <input
              id="insuranceProvider"
              type="text"
              {...register('insuranceProvider')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="insurancePolicy" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Policy number
            </label>
            <input
              id="insurancePolicy"
              type="text"
              {...register('insurancePolicy')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="insuranceGroup" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Group number
            </label>
            <input
              id="insuranceGroup"
              type="text"
              {...register('insuranceGroup')}
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="allergiesText" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Allergies
          </label>
          <textarea
            id="allergiesText"
            {...register('allergiesText')}
            placeholder="Separate with commas or new lines"
            rows={2}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="chronicConditionsText" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Chronic conditions
          </label>
          <textarea
            id="chronicConditionsText"
            {...register('chronicConditionsText')}
            placeholder="Separate with commas or new lines"
            rows={2}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-5">
          <label htmlFor="currentMedicationsText" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Current medications
          </label>
          <textarea
            id="currentMedicationsText"
            {...register('currentMedicationsText')}
            placeholder="Separate with commas or new lines"
            rows={2}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="careLevel" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Care level
            </label>
            <input
              id="careLevel"
              type="text"
              {...register('careLevel')}
              placeholder="e.g. independent, assisted"
              className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div>
            <label htmlFor="primaryPhysicianId" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Primary physician user ID
            </label>
            <input
              id="primaryPhysicianId"
              type="text"
              {...register('primaryPhysicianId')}
              placeholder="UUID if known"
              className="mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="notes" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Notes
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border"
            style={{ accentColor: 'var(--color-primary)' }}
          />
          <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Patient record is active
          </label>
        </div>

        <p className="mb-4 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Your membership
        </p>
        <div className="mb-5">
          <label htmlFor="relationship" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Your relationship to the patient
          </label>
          <select
            id="relationship"
            {...relationshipField}
            onChange={e => {
              relationshipField.onChange(e);
              clearErrors('relationship');
            }}
            className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(errors.relationship?.message),
              color: 'var(--color-text-primary)',
            }}
          >
            {RELATIONSHIP_OPTIONS.map(opt => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.relationship && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {errors.relationship.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/groups/list')}
            className="h-10 rounded-lg border px-4 text-sm font-bold"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'Creating...' : 'Create circle'}
          </button>
        </div>
      </form>
    </section>
  );
}
