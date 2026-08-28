CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    display_name  VARCHAR(255) NOT NULL,
    username      VARCHAR(64)  NOT NULL UNIQUE,   -- for @mentions
    avatar_url    TEXT,
    password_hash VARCHAR(255) NOT NULL,           -- Argon2id
    is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups (security / ACL)
CREATE TABLE IF NOT EXISTS groups (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_buggroup BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_group_map (
    user_id   UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    group_id  UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    can_bless BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, group_id)
);

-- Product hierarchy
CREATE TABLE IF NOT EXISTS classifications (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    VARCHAR(64) NOT NULL UNIQUE,
    sortkey SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name              VARCHAR(64) NOT NULL UNIQUE,
    classification_id BIGINT REFERENCES classifications(id),
    description       TEXT NOT NULL DEFAULT '',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    default_milestone VARCHAR(64) NOT NULL DEFAULT '---'
);

CREATE TABLE IF NOT EXISTS components (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(64) NOT NULL,
    product_id       BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    description      TEXT NOT NULL DEFAULT '',
    default_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (product_id, name)
);

CREATE TABLE IF NOT EXISTS versions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    value      VARCHAR(64) NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (product_id, value)
);

CREATE TABLE IF NOT EXISTS milestones (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    value      VARCHAR(64) NOT NULL,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sortkey    SMALLINT NOT NULL DEFAULT 0,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (product_id, value)
);

-- Central bug entity
CREATE TABLE IF NOT EXISTS bugs (
    id               BIGINT GENERATED ALWAYS AS IDENTITY (CACHE 1) PRIMARY KEY,
    summary          VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    status           VARCHAR(32) NOT NULL DEFAULT 'UNCONFIRMED'
                       CHECK (status IN ('UNCONFIRMED','CONFIRMED','IN_PROGRESS','RESOLVED','VERIFIED','CLOSED')),
    resolution       VARCHAR(32) NOT NULL DEFAULT ''
                       CHECK (resolution IN ('','FIXED','INVALID','WONTFIX','DUPLICATE','WORKSFORME','INCOMPLETE')),
    priority         VARCHAR(8)  NOT NULL DEFAULT 'P3'
                       CHECK (priority IN ('P1','P2','P3','P4','P5')),
    severity         VARCHAR(32) NOT NULL DEFAULT 'normal'
                       CHECK (severity IN ('blocker','critical','major','normal','minor','trivial','enhancement')),
    product_id       BIGINT NOT NULL REFERENCES products(id),
    component_id     BIGINT NOT NULL REFERENCES components(id),
    version          VARCHAR(64) NOT NULL DEFAULT 'unspecified',
    target_milestone VARCHAR(64) NOT NULL DEFAULT '---',
    reporter_id      UUID NOT NULL REFERENCES users(id),
    assignee_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    qa_contact_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    duplicate_of     BIGINT REFERENCES bugs(id),
    estimated_time   DECIMAL(7,2) NOT NULL DEFAULT 0,
    remaining_time   DECIMAL(7,2) NOT NULL DEFAULT 0,
    deadline         TIMESTAMPTZ,
    -- Security / CVSS (schema present from Day 1; used from Day 2)
    is_embargoed     BOOLEAN NOT NULL DEFAULT FALSE,
    embargo_until    TIMESTAMPTZ,
    cvss_vector      VARCHAR(128),
    cvss_score       DECIMAL(3,1),
    cvss_severity    VARCHAR(16) CHECK (cvss_severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    -- Auto-maintained FTS vector
    search_vector    TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(summary,'') || ' ' || coalesce(description,''))
    ) STORED,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bugs_status   ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_product  ON bugs(product_id, status);
CREATE INDEX IF NOT EXISTS idx_bugs_assignee ON bugs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_bugs_reporter ON bugs(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bugs_created  ON bugs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bugs_fts      ON bugs USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_bugs_embargo  ON bugs(is_embargoed, embargo_until) WHERE is_embargoed = TRUE;
CREATE INDEX IF NOT EXISTS idx_bugs_summary_trgm ON bugs USING GIN(summary gin_trgm_ops);

-- Append-only audit trail — NEVER UPDATE OR DELETE ROWS
CREATE TABLE IF NOT EXISTS bugs_activity (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id     BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    who_id     UUID   NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    field      VARCHAR(64) NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    comment    TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_bug ON bugs_activity(bug_id, changed_at DESC);

-- Comments (format discriminates Markdown vs plain)
CREATE TABLE IF NOT EXISTS bug_comments (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id     BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    author_id  UUID   NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    format     VARCHAR(16) NOT NULL DEFAULT 'markdown'
                 CHECK (format IN ('plain','markdown')),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id  BIGINT REFERENCES bug_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_bug ON bug_comments(bug_id, created_at);

-- @mention tracking
CREATE TABLE IF NOT EXISTS comment_mentions (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id        BIGINT NOT NULL REFERENCES bug_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (comment_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON comment_mentions(mentioned_user_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(32) NOT NULL
                 CHECK (type IN ('mention','status_change','flag_request','flag_granted','flag_denied')),
    payload    JSONB NOT NULL DEFAULT '{}',
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id       BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    submitter_id UUID   NOT NULL REFERENCES users(id),
    filename     VARCHAR(255) NOT NULL,
    mime_type    VARCHAR(128) NOT NULL,
    size_bytes   BIGINT NOT NULL,
    storage_path TEXT,
    is_patch     BOOLEAN NOT NULL DEFAULT FALSE,
    is_private   BOOLEAN NOT NULL DEFAULT FALSE,
    is_obsolete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flags (three-state: ?, +, -)
CREATE TABLE IF NOT EXISTS flag_types (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT NOT NULL DEFAULT '',
    target_type     CHAR(1) NOT NULL DEFAULT 'b' CHECK (target_type IN ('b','a')),
    is_requestable  BOOLEAN NOT NULL DEFAULT TRUE,
    is_requesteeble BOOLEAN NOT NULL DEFAULT TRUE,
    grant_group_id  UUID REFERENCES groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS flags (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type_id      BIGINT NOT NULL REFERENCES flag_types(id) ON DELETE CASCADE,
    status       CHAR(1) NOT NULL CHECK (status IN ('?','+','-')),
    bug_id       BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    attach_id    BIGINT REFERENCES attachments(id) ON DELETE CASCADE,
    setter_id    UUID NOT NULL REFERENCES users(id),
    requestee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flags_bug ON flags(bug_id);

-- CC list
CREATE TABLE IF NOT EXISTS bug_cc (
    bug_id  BIGINT NOT NULL REFERENCES bugs(id)  ON DELETE CASCADE,
    user_id UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (bug_id, user_id)
);

-- Security group restrictions
CREATE TABLE IF NOT EXISTS bug_group_map (
    bug_id   BIGINT NOT NULL REFERENCES bugs(id)   ON DELETE CASCADE,
    group_id UUID   NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (bug_id, group_id)
);

-- Keywords
CREATE TABLE IF NOT EXISTS keyword_defs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(64) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS bug_keywords (
    bug_id     BIGINT NOT NULL REFERENCES bugs(id)         ON DELETE CASCADE,
    keyword_id BIGINT NOT NULL REFERENCES keyword_defs(id) ON DELETE CASCADE,
    PRIMARY KEY (bug_id, keyword_id)
);

-- Saved queries
CREATE TABLE IF NOT EXISTS named_queries (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(64) NOT NULL,
    query_json JSONB NOT NULL,
    UNIQUE (user_id, name)
);

-- Sessions (HTTP-only cookie auth)
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    ip_addr    INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

-- Dependency graph (schema on Day 1; used from Day 2)
CREATE TABLE IF NOT EXISTS bug_dependencies (
    blocking_bug_id BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    blocked_bug_id  BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (blocking_bug_id, blocked_bug_id),
    CONSTRAINT chk_no_self_dependency CHECK (blocking_bug_id <> blocked_bug_id)
);
CREATE INDEX IF NOT EXISTS idx_dep_blocked  ON bug_dependencies(blocked_bug_id,  blocking_bug_id);
CREATE INDEX IF NOT EXISTS idx_dep_blocking ON bug_dependencies(blocking_bug_id, blocked_bug_id);

-- Git integration (schema on Day 1; used from Day 3)
CREATE TABLE IF NOT EXISTS bug_commits (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id         BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    repo_full_name VARCHAR(256) NOT NULL,
    commit_sha     VARCHAR(40)  NOT NULL,
    commit_message TEXT NOT NULL,
    author_name    VARCHAR(256),
    author_email   VARCHAR(256),
    committed_at   TIMESTAMPTZ,
    html_url       TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bug_id, commit_sha)
);

CREATE TABLE IF NOT EXISTS bug_pull_requests (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bug_id         BIGINT NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    repo_full_name VARCHAR(256) NOT NULL,
    pr_number      INT NOT NULL,
    pr_title       TEXT NOT NULL,
    pr_state       VARCHAR(16) NOT NULL CHECK (pr_state IN ('open','closed','merged')),
    pr_url         TEXT NOT NULL,
    merged_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bug_id, repo_full_name, pr_number)
);
CREATE INDEX IF NOT EXISTS idx_commits_bug ON bug_commits(bug_id);
CREATE INDEX IF NOT EXISTS idx_prs_bug     ON bug_pull_requests(bug_id);
