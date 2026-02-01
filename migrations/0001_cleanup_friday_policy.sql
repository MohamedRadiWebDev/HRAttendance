ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS friday_comp_leave_note text,
  ADD COLUMN IF NOT EXISTS friday_comp_leave_updated_by text;

DROP TABLE IF EXISTS friday_policy_settings;
DROP TABLE IF EXISTS audit_logs;
