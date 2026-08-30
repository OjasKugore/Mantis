-- 002_team_invites.sql: Add priority_rank to users and create team_invites table

ALTER TABLE users ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 100;

CREATE TABLE IF NOT EXISTS team_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255),
    token VARCHAR(64) NOT NULL UNIQUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    groups TEXT[] NOT NULL DEFAULT '{}',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    priority_rank INTEGER DEFAULT 100,
    is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_users_priority_rank ON users(priority_rank ASC, created_at ASC);
