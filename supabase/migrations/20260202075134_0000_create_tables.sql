/*
  # Create HR & Attendance System Tables

  1. New Tables
    - `employees` - Employee master data
    - `biometric_punches` - Fingerprint attendance records
    - `excel_templates` - Import template configurations
    - `special_rules` - Shift and attendance rules
    - `adjustments` - Leave and permission records
    - `attendance_records` - Calculated daily attendance
    - `friday_policy_settings` - Friday work policy configuration
    - `audit_logs` - System action logs

  2. Security
    - RLS enabled on all tables
    - Policies allow full access (for now - can be restricted based on roles)
*/

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  sector TEXT,
  department TEXT,
  section TEXT,
  job_title TEXT,
  branch TEXT,
  governorate TEXT,
  hire_date TEXT,
  termination_date TEXT,
  termination_reason TEXT,
  service_duration TEXT,
  direct_manager TEXT,
  dept_manager TEXT,
  national_id TEXT,
  birth_date TEXT,
  address TEXT,
  birth_place TEXT,
  personal_phone TEXT,
  emergency_phone TEXT,
  shift_start TEXT DEFAULT '09:00'
);

CREATE TABLE IF NOT EXISTS biometric_punches (
  id SERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL,
  punch_datetime TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS excel_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  mapping JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS special_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  scope TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  params JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS adjustments (
  id SERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  total_hours DOUBLE PRECISION DEFAULT 0,
  overtime_hours DOUBLE PRECISION DEFAULT 0,
  status TEXT,
  penalties JSONB,
  is_overnight BOOLEAN DEFAULT false,
  friday_comp_leave BOOLEAN DEFAULT false,
  friday_comp_leave_manual BOOLEAN DEFAULT false,
  friday_comp_leave_note TEXT,
  friday_comp_leave_updated_by TEXT
);

CREATE TABLE IF NOT EXISTS friday_policy_settings (
  id SERIAL PRIMARY KEY,
  included_sectors JSONB DEFAULT '[]',
  monthly_minimum_fridays_required INTEGER DEFAULT 2,
  max_credit_per_month INTEGER DEFAULT 3,
  allowed_off_days_next_month JSONB DEFAULT '[]',
  count_biometric_as_worked_friday BOOLEAN DEFAULT true,
  count_mission_as_worked_friday BOOLEAN DEFAULT true,
  count_permission_only_as_worked_friday BOOLEAN DEFAULT false,
  count_leave_as_worked_friday BOOLEAN DEFAULT false,
  official_holiday_friday_counts BOOLEAN DEFAULT false,
  weekly_rest_friday_counts BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE friday_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to employees"
  ON employees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to biometric_punches"
  ON biometric_punches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to excel_templates"
  ON excel_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to special_rules"
  ON special_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to adjustments"
  ON adjustments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to attendance_records"
  ON attendance_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to friday_policy_settings"
  ON friday_policy_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to audit_logs"
  ON audit_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
