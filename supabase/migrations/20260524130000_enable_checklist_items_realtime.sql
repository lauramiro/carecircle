/*
 * Realtime: broadcast checklist_items changes (e.g. backend overdue cron) to subscribed clients.
 * overdue_at: canonical instant the backend marked the dose overdue (grace window end).
 */
ALTER publication supabase_realtime
  ADD TABLE checklist_items;

ALTER TABLE public.checklist_items REPLICA IDENTITY FULL;

ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS overdue_at timestamptz;

COMMENT ON COLUMN public.checklist_items.overdue_at IS
  'Set by backend overdue detection when status transitions from due to overdue.';
