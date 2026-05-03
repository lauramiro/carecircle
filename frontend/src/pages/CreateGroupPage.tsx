import { useState } from "react";
import { Heart } from 'lucide-react' ;
import { supabase } from '../lib/supabaseClient';

export default function CreateGroupPage() {
    const [groupName, setGroupName]  = useState('');
    const [groupNameError , setGroupNameError] = useState<string | null>(null);
    const [formError, setFormError ] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setGroupNameError(null);

        if (!groupName.trim()) {
            setGroupNameError('Group name is required');
            return;
        }
        if (groupName.trim().length < 3) {
            setGroupNameError('Group name must be at least 3 characters.');
            return;
        }
        setLoading(true);
        try {
            const { data: { user }} = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            //STEP 1: Create the patient (care recipient) record
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

            //STEP 2: Add the creator as first care circle member
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

            setSuccess(true);
        }   catch (err: any) {
            console.error('Error:', err)
            setFormError('Something went wrong. Please try again.');

        }
        setLoading(false);
    }
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <Heart size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </div>
          <p style={{ fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Circle created!
          </p>
          <p className="mt-2" style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            <strong>{groupName}</strong> is ready. You can now invite members to join.
          </p>
          <button onClick={() => { setSuccess(false); setGroupName(''); }}
            style={{ marginTop: '16px', background: 'none', border: 'none',
              color: 'var(--color-primary)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Create another circle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <Heart size={24} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 style={{ fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Create a Care Circle
          </h1>
          <p className="mt-1" style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            Give your care group a name to get started
          </p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: '12px', padding: '32px' }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* Group name input */}
            <div className="mb-6">
              <label htmlFor="groupName" style={{ display: 'block', fontSize: '12px', fontWeight: 500,
                fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--color-text-secondary)',
                marginBottom: '6px', letterSpacing: '0.01em' }}>
                Circle name
              </label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={e => { setGroupName(e.target.value); setGroupNameError(null); setFormError(null); }}
                placeholder="e.g. Mum's Care Team"
                style={{ width: '100%', height: '40px', padding: '0 12px',
                  border: `1px solid ${groupNameError ? 'var(--color-status-critical)' : 'var(--color-border)'}`,
                  borderRadius: '8px', fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  color: 'var(--color-text-primary)', backgroundColor: 'var(--color-card)',
                  outline: 'none', boxSizing: 'border-box' as const }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-border-focus)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(58,111,191,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = groupNameError
                  ? 'var(--color-status-critical)' : 'var(--color-border)';
                  e.target.style.boxShadow = 'none'; }}
              />
              {groupNameError && (
                <p style={{ fontSize: '12px', color: 'var(--color-status-critical)',
                  marginTop: '4px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {groupNameError}
                </p>
              )}
            </div>

            {/* Form-level error */}
            {formError && (
              <div className="mb-4" style={{ backgroundColor: 'var(--color-status-critical-bg)',
                border: '1px solid #F0BEBE', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-status-critical)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
                  {formError}
                </p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{ width: '100%', height: '48px',
              backgroundColor: loading ? 'var(--color-accent-soft)' : 'var(--color-primary)',
              color: loading ? 'var(--color-text-hint)' : '#ffffff', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease' }}>
              {loading ? 'Creating circle...' : 'Create circle'}
            </button>
          </form>
        </div>

        {/* Medical disclaimer */}
        <p className="text-center mt-6" style={{ fontSize: '11px', color: 'var(--color-text-hint)',
          fontFamily: 'Plus Jakarta Sans, sans-serif', lineHeight: 1.6 }}>
          CareCircle is a coordination tool, not a medical device.<br />
          Always consult a doctor for medical decisions.
        </p>
      </div>
    </div>
    );
}
