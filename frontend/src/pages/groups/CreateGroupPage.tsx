import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabaseClient';

const RELATIONSHIP_OPTIONS = [
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

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState('');
  const [patientFullName, setPatientFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const [patientFullNameError, setPatientFullNameError] = useState<string | null>(null);
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setGroupNameError(null);
    setPatientFullNameError(null);
    setDateOfBirthError(null);
    setRelationshipError(null);

    let hasError = false;
    if (!groupName.trim()) {
      setGroupNameError('Group name is required.');
      hasError = true;
    } else if (groupName.trim().length < 3) {
      setGroupNameError('Group name must be at least 3 characters.');
      hasError = true;
    }

    if (!patientFullName.trim()) {
      setPatientFullNameError("Patient's full name is required.");
      hasError = true;
    } else if (patientFullName.trim().length < 2) {
      setPatientFullNameError('Name must be at least 2 characters.');
      hasError = true;
    }

    if (!dateOfBirth) {
      setDateOfBirthError('Date of birth is required.');
      hasError = true;
    } else {
      const dob = new Date(dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        setDateOfBirthError('Enter a valid date of birth.');
        hasError = true;
      } else {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (dob > today) {
          setDateOfBirthError('Date of birth cannot be in the future.');
          hasError = true;
        }
      }
    }

    if (!relationship) {
      setRelationshipError('Select your relationship to the patient.');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const patientInsert: Record<string, unknown> = {
        full_name: patientFullName.trim(),
        date_of_birth: dateOfBirth,
        primary_caregiver_id: user.id,
        is_active: true,
      };
      const trimmedPatientEmail = patientEmail.trim();
      if (trimmedPatientEmail) {
        patientInsert.email = trimmedPatientEmail;
      }

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert(patientInsert)
        .select('id')
        .single();

      if (patientError) throw patientError;

      const { error: memberError } = await supabase
        .from('care_group')
        .insert({
          patient_id: patient.id,
          caregiver_id: user.id,
          relationship,
          role_in_care: 'Primary Carer',
          can_view_medical: true,
          can_edit_medical: true,
          can_schedule: true,
          can_communicate: true,
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      toast.success(`"${groupName.trim()}" care circle created!`);
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
          Name your circle and add the essential details for the person receiving care.
        </p>
      </div>

      <div
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: 'var(--color-border)', maxWidth: '520px' }}
      >
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
            value={groupName}
            onChange={e => {
              setGroupName(e.target.value);
              setGroupNameError(null);
            }}
            placeholder="e.g. Mum's Care Team"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: groupNameError
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {groupNameError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {groupNameError}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="patientFullName"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Patient full name
          </label>
          <input
            id="patientFullName"
            type="text"
            value={patientFullName}
            onChange={e => {
              setPatientFullName(e.target.value);
              setPatientFullNameError(null);
            }}
            placeholder="Legal name as used for care records"
            autoComplete="name"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: patientFullNameError
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {patientFullNameError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {patientFullNameError}
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
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={e => {
              setDateOfBirth(e.target.value);
              setDateOfBirthError(null);
            }}
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: dateOfBirthError
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {dateOfBirthError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {dateOfBirthError}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="patientEmail"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Patient email <span className="font-normal opacity-80">(optional)</span>
          </label>
          <input
            id="patientEmail"
            type="email"
            value={patientEmail}
            onChange={e => setPatientEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="relationship"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Your relationship to the patient
          </label>
          <select
            id="relationship"
            value={relationship}
            onChange={e => {
              setRelationship(e.target.value);
              setRelationshipError(null);
            }}
            className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
            style={{
              borderColor: relationshipError
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            {RELATIONSHIP_OPTIONS.map(opt => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {relationshipError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {relationshipError}
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
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'Creating...' : 'Create circle'}
          </button>
        </div>
      </div>
    </section>
  );
}
