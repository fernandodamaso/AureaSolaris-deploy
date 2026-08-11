-- Aurea Solaris / private.sqlite
-- Dados confidenciais. Um registro pessoal sempre pertence a owner_id.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migration (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  login_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_verifier TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'argon2id',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  relationship_to_owner TEXT NOT NULL DEFAULT 'self',
  consent_level TEXT NOT NULL DEFAULT 'private' CHECK (consent_level IN ('private','shared_by_consent','reference_only')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS natal_subject (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  birth_date TEXT NOT NULL,
  birth_time TEXT,
  time_accuracy TEXT NOT NULL DEFAULT 'unknown' CHECK (time_accuracy IN ('exact','approximate','unknown')),
  birth_place_label TEXT,
  latitude REAL,
  longitude REAL,
  timezone_id TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'private' CHECK (privacy_level IN ('private','restricted','shared_by_consent')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preference (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, preference_key)
);

CREATE TABLE IF NOT EXISTS hermes_method (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','retired')),
  source_note TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS hermes_memory (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  subject_profile_id TEXT REFERENCES profile(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference','interpretive_pattern','study_note','instruction','correction')),
  content TEXT NOT NULL,
  evidence_note TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','revoked')),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS note (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  note_kind TEXT NOT NULL DEFAULT 'note' CHECK (note_kind IN ('note','journal','study','board_card')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS plan_item (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('task','event','habit','reminder')),
  start_at TEXT,
  end_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
  astro_context_json TEXT,
  external_provider TEXT,
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credential_reference (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  secret_ref TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  UNIQUE(owner_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_profile_owner ON profile(owner_id);
CREATE INDEX IF NOT EXISTS idx_natal_owner ON natal_subject(owner_id);
CREATE INDEX IF NOT EXISTS idx_memory_owner_status ON hermes_memory(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_note_owner_updated ON note(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_plan_owner_start ON plan_item(owner_id, start_at);
