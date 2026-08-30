-- 003_onboarding.sql: Add onboarded and team_name to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);

-- Mark seed / demo users as already onboarded so judge sessions bypass onboarding
UPDATE users SET onboarded = TRUE WHERE email LIKE '%@mozilla.com' OR email = 'admin@mantis.local';
