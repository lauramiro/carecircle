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

const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
] as const;

const BLOOD_TYPE_OPTIONS = [
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

function parseCommaSeparatedList(raw: string): string[] | undefined {
  const items = raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function pickDefined<T extends Record<string, string>>(obj: T): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const t = v.trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : undefined;
}

function RequiredMark() {
  return (
    <span style={{ color: 'var(--color-status-critical)' }} aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState('');
  const [patientFullName, setPatientFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userId, setUserId] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressRegion, setAddressRegion] = useState('');
  const [addressPostal, setAddressPostal] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [medicalRecordNumber, setMedicalRecordNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [insuranceGroup, setInsuranceGroup] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicConditionsText, setChronicConditionsText] = useState('');
  const [currentMedicationsText, setCurrentMedicationsText] = useState('');
  const [careLevel, setCareLevel] = useState('');
  const [primaryPhysicianId, setPrimaryPhysicianId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
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
        is_active: isActive,
      };

      const uid = userId.trim();
      if (uid) patientInsert.user_id = uid;

      if (gender) patientInsert.gender = gender;

      const bt = bloodType.trim();
      if (bt) patientInsert.blood_type = bt;

      const em = patientEmail.trim();
      patientInsert.email = em || null;

      const ph = phone.trim();
      patientInsert.phone = ph || null;

      // Ensure at least one contact method exists to satisfy the check constraint `valid_patient_contact`
      if (!patientInsert.email && !patientInsert.phone) {
        throw new Error('A patient must have either an email or a phone number to satisfy the contact constraints.');
      }

      const emergency = pickDefined({
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelationship,
      });
      if (emergency) patientInsert.emergency_contact = emergency;

      const address = pickDefined({
        line1: addressLine1,
        line2: addressLine2,
        city: addressCity,
        region: addressRegion,
        postal_code: addressPostal,
        country: addressCountry,
      });
      if (address) patientInsert.address = address;

      const mrn = medicalRecordNumber.trim();
      if (mrn) patientInsert.medical_record_number = mrn;

      const insurance = pickDefined({
        provider: insuranceProvider,
        policy_number: insurancePolicy,
        group_number: insuranceGroup,
      });
      if (insurance) patientInsert.insurance_info = insurance;

      const allergies = parseCommaSeparatedList(allergiesText);
      if (allergies) patientInsert.allergies = allergies;

      const chronic = parseCommaSeparatedList(chronicConditionsText);
      if (chronic) patientInsert.chronic_conditions = chronic;

      const meds = parseCommaSeparatedList(currentMedicationsText);
      if (meds) patientInsert.current_medications = meds;

      const cl = careLevel.trim();
      if (cl) patientInsert.care_level = cl;

      const ppi = primaryPhysicianId.trim();
      if (ppi) patientInsert.primary_physician_id = ppi;

      const n = notes.trim();
      if (n) patientInsert.notes = n;

      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert(patientInsert)
        .select('id')
        .single();

      if (patientError) throw patientError;

      const { data: group, error: groupError } = await supabase
        .from('care_group')
        .insert({
          name: groupName.trim(),
          patient_id: patient.id,
          caregiver_id: user.id,
        })
        .select('id')
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from('care_givers')
        .insert({
          patient_id: patient.id,
          care_giver_id: user.id,
          group_id: group.id,
          role_in_care: 'Primary Carer',
          can_view_medical: true,
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

  const inputBorder = (err: string | null) =>
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

      <div
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: 'var(--color-border)', maxWidth: '640px' }}
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
            value={groupName}
            onChange={e => {
              setGroupName(e.target.value);
              setGroupNameError(null);
            }}
            placeholder="e.g. Mum's Care Team"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(groupNameError),
              color: 'var(--color-text-primary)',
            }}
          />
          {groupNameError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {groupNameError}
            </p>
          )}
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
            value={patientFullName}
            onChange={e => {
              setPatientFullName(e.target.value);
              setPatientFullNameError(null);
            }}
            placeholder="Legal name as used for care records"
            autoComplete="name"
            aria-required="true"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(patientFullNameError),
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
            <RequiredMark />
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={e => {
              setDateOfBirth(e.target.value);
              setDateOfBirthError(null);
            }}
            aria-required="true"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(dateOfBirthError),
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
          <label htmlFor="userId" className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
            Linked user ID
          </label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
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
              value={gender}
              onChange={e => setGender(e.target.value)}
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
              value={bloodType}
              onChange={e => setBloodType(e.target.value)}
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
              value={patientEmail}
              onChange={e => setPatientEmail(e.target.value)}
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
              value={phone}
              onChange={e => setPhone(e.target.value)}
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
              value={emergencyName}
              onChange={e => setEmergencyName(e.target.value)}
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
              value={emergencyPhone}
              onChange={e => setEmergencyPhone(e.target.value)}
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
              value={emergencyRelationship}
              onChange={e => setEmergencyRelationship(e.target.value)}
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
            value={addressLine1}
            onChange={e => setAddressLine1(e.target.value)}
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
            value={addressLine2}
            onChange={e => setAddressLine2(e.target.value)}
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
              value={addressCity}
              onChange={e => setAddressCity(e.target.value)}
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
              value={addressRegion}
              onChange={e => setAddressRegion(e.target.value)}
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
              value={addressPostal}
              onChange={e => setAddressPostal(e.target.value)}
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
              value={addressCountry}
              onChange={e => setAddressCountry(e.target.value)}
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
            value={medicalRecordNumber}
            onChange={e => setMedicalRecordNumber(e.target.value)}
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
              value={insuranceProvider}
              onChange={e => setInsuranceProvider(e.target.value)}
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
              value={insurancePolicy}
              onChange={e => setInsurancePolicy(e.target.value)}
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
              value={insuranceGroup}
              onChange={e => setInsuranceGroup(e.target.value)}
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
            value={allergiesText}
            onChange={e => setAllergiesText(e.target.value)}
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
            value={chronicConditionsText}
            onChange={e => setChronicConditionsText(e.target.value)}
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
            value={currentMedicationsText}
            onChange={e => setCurrentMedicationsText(e.target.value)}
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
              value={careLevel}
              onChange={e => setCareLevel(e.target.value)}
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
              value={primaryPhysicianId}
              onChange={e => setPrimaryPhysicianId(e.target.value)}
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
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div className="mb-6 flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
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
            value={relationship}
            onChange={e => {
              setRelationship(e.target.value);
              setRelationshipError(null);
            }}
            className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
            style={{
              borderColor: inputBorder(relationshipError),
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
