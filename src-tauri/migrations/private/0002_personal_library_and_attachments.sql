-- Biblioteca e arquivos privados. O arquivo físico fica fora do banco;
-- o banco guarda somente metadados, integridade e autorização por owner_id.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS personal_library_item (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('book','pdf','article','link','website','course','other')),
  title TEXT NOT NULL,
  authors_json TEXT NOT NULL DEFAULT '[]',
  bibliographic_json TEXT NOT NULL DEFAULT '{}',
  url TEXT,
  local_file_ref TEXT,
  content_hash TEXT,
  reading_status TEXT NOT NULL DEFAULT 'saved' CHECK (reading_status IN ('saved','reading','studied','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS private_attachment (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  library_item_id TEXT REFERENCES personal_library_item(id) ON DELETE SET NULL,
  attachment_kind TEXT NOT NULL CHECK (attachment_kind IN ('health_document','study_document','personal_document','image','other')),
  original_filename TEXT NOT NULL,
  media_type TEXT,
  storage_ref TEXT NOT NULL,
  content_hash TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'private' CHECK (sensitivity IN ('private','sensitive_health','restricted')),
  extraction_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (extraction_status IN ('not_requested','pending','completed','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_tradition_preference (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  tradition_key TEXT NOT NULL,
  preference_mode TEXT NOT NULL DEFAULT 'explore' CHECK (preference_mode IN ('explore','primary','compare','exclude')),
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, tradition_key)
);

CREATE INDEX IF NOT EXISTS idx_library_owner ON personal_library_item(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_attachment_owner_kind ON private_attachment(owner_id, attachment_kind);
CREATE INDEX IF NOT EXISTS idx_tradition_owner ON study_tradition_preference(owner_id);
