-- Aurea Solaris / knowledge.sqlite
-- Banco canônico de conhecimento astrológico. Não armazena dados pessoais.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migration (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  published_year INTEGER,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('book','article','manuscript','website','dataset','course','personal_archive')),
  tradition TEXT,
  language TEXT,
  license_note TEXT,
  canonical_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_document (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES source(id) ON DELETE RESTRICT,
  original_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  content_text TEXT,
  content_sha256 TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(original_path, content_sha256)
);

CREATE TABLE IF NOT EXISTS concept (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  concept_type TEXT NOT NULL CHECK (concept_type IN ('planet','luminary','sign','house','aspect','point','technique','chart_type','timing','medical_astrology','other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','published','deprecated')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim (
  id TEXT PRIMARY KEY,
  concept_id TEXT NOT NULL REFERENCES concept(id) ON DELETE RESTRICT,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE RESTRICT,
  statement TEXT NOT NULL,
  tradition TEXT,
  interpretation_scope TEXT,
  evidence_grade TEXT NOT NULL DEFAULT 'traditional' CHECK (evidence_grade IN ('traditional','editorial','empirical','hypothesis','disputed')),
  editorial_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (editorial_status IN ('unreviewed','reviewed','published','superseded')),
  source_locator TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  supersedes_claim_id TEXT REFERENCES claim(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS concept_relation (
  id TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL REFERENCES concept(id) ON DELETE RESTRICT,
  to_concept_id TEXT NOT NULL REFERENCES concept(id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('governs','rules','is_in_tension_with','modifies','requires','contradicts','related_to')),
  source_id TEXT REFERENCES source(id) ON DELETE RESTRICT,
  note TEXT,
  UNIQUE(from_concept_id, to_concept_id, relation_type, source_id)
);

CREATE TABLE IF NOT EXISTS import_manifest (
  id TEXT PRIMARY KEY,
  importer_version TEXT NOT NULL,
  origin_label TEXT NOT NULL,
  source_tree_sha256 TEXT NOT NULL,
  file_count INTEGER NOT NULL CHECK (file_count >= 0),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_claim_concept ON claim(concept_id);
CREATE INDEX IF NOT EXISTS idx_claim_source ON claim(source_id);
CREATE INDEX IF NOT EXISTS idx_document_sha ON source_document(content_sha256);
