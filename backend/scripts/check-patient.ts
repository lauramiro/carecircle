import { supabase } from '../src/lib/supabase';

async function main() {
  const groupId = process.argv[2];
  if (!groupId) {
    console.error('Usage: ts-node backend/scripts/check-patient.ts <groupId>');
    process.exit(2);
  }

  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, full_name, group_id')
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }

    if (!patient) {
      console.log(`No patient found for groupId=${groupId}`);
      process.exit(0);
    }

    console.log('Patient found:');
    console.log(patient);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

void main();
