import { supabase } from '@lib/supabaseClient';
import { CHECKLIST_PROOF_BUCKET } from '@components/checklist/medicationChecklist.constants';
import type { ChecklistItemPatch, MarkAsGivenInput, SkipChecklistItemInput } from './checklist.types';

export async function getCurrentCarerProfileId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function uploadProofPhoto(itemId: string, photoFile: File): Promise<string> {
  const ext = photoFile.name.split('.').pop() || 'jpg';
  const objectPath = `checklist-proofs/${itemId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(CHECKLIST_PROOF_BUCKET)
    .upload(objectPath, photoFile, { upsert: false, contentType: photoFile.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(CHECKLIST_PROOF_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function markChecklistItemGiven(
  input: MarkAsGivenInput,
): Promise<ChecklistItemPatch> {
  const carerId = await getCurrentCarerProfileId();
  const givenAt = new Date().toISOString();

  let photoUrl: string | null = null;
  if (input.photoFile) {
    photoUrl = await uploadProofPhoto(input.itemId, input.photoFile);
  }

  const patch: ChecklistItemPatch = {
    status: 'given',
    given_at: givenAt,
    given_by_carer_id: carerId,
    given_notes: input.notes.trim() || null,
    overdue_hours: input.asLate ? input.overdueHours : null,
    overdue_minutes: input.asLate ? input.overdueMinutes : null,
    updated_at: givenAt,
  };

  const { error } = await supabase
    .from('checklist_items')
    .update(patch)
    .eq('id', input.itemId);

  if (error) throw error;

  if (photoUrl && carerId) {
    const { error: confirmationErr } = await supabase.from('medication_confirmations').insert({
      checklist_item_id: input.itemId,
      carer_id: carerId,
      photo_url: photoUrl,
      confirmed_at_utc: givenAt,
      local_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (confirmationErr) throw confirmationErr;
  }

  return patch;
}

export async function skipChecklistItem(input: SkipChecklistItemInput): Promise<ChecklistItemPatch> {
  const updatedAt = new Date().toISOString();
  const patch: ChecklistItemPatch = {
    status: 'skipped',
    skip_reason: input.reason,
    skip_notes: input.notes.trim() || null,
    updated_at: updatedAt,
  };

  const { error } = await supabase.from('checklist_items').update(patch).eq('id', input.itemId);
  if (error) throw error;

  return patch;
}
