import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabaseClient';

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState('');
  const [groupNameError, setGroupNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setGroupNameError(null);

    if (!groupName.trim()) {
      setGroupNameError('Group name is required.');
      return;
    }
    if (groupName.trim().length < 3) {
      setGroupNameError('Group name must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Create the patient (care recipient) record
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          full_name: groupName.trim(),
          date_of_birth: '1990-01-01',
          primary_caregiver_id: user.id,
          is_active: true,
        })
        .select('id')
        .single();

      if (patientError) throw patientError;

      // Step 2: Add creator as primary care circle member
      const { error: memberError } = await supabase
        .from('care_circle_members')
        .insert({
          patient_id: patient.id,
          caregiver_id: user.id,
          relationship: 'primary',
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
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong. Please try again.');
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
          Give your care group a name to get started.
        </p>
      </div>

      <div
        className="rounded-xl border bg-white p-6"
        style={{ borderColor: 'var(--color-border)', maxWidth: '480px' }}
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