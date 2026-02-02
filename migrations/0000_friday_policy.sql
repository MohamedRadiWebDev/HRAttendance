ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS friday_comp_leave boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS friday_comp_leave_manual boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS friday_policy_settings (
  id serial PRIMARY KEY,
  included_sectors jsonb NOT NULL,
  monthly_minimum_fridays_required integer NOT NULL DEFAULT 2,
  max_credit_per_month integer NOT NULL DEFAULT 3,
  allowed_off_days_next_month jsonb NOT NULL,
  count_biometric_as_worked_friday boolean NOT NULL DEFAULT true,
  count_mission_as_worked_friday boolean NOT NULL DEFAULT true,
  count_permission_only_as_worked_friday boolean NOT NULL DEFAULT false,
  count_leave_as_worked_friday boolean NOT NULL DEFAULT false,
  official_holiday_friday_counts boolean NOT NULL DEFAULT false,
  weekly_rest_friday_counts boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  employee_code text NOT NULL,
  date text NOT NULL,
  action text NOT NULL,
  details jsonb,
  timestamp timestamp DEFAULT now()
);
