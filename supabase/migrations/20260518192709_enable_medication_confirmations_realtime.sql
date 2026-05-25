/*
 * This migration enables real-time updates for the medication_confirmations table
 * by adding it to the supabase_realtime publication.
 */
ALTER publication supabase_realtime
    ADD TABLE medication_confirmations;
