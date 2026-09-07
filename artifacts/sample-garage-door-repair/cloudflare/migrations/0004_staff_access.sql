CREATE TABLE IF NOT EXISTS garage_staff_access (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  clerk_user_id TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
  protected_owner INTEGER NOT NULL DEFAULT 0 CHECK (protected_owner IN (0, 1)),
  granted_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS garage_auth_bootstrap (
  environment TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  access_id TEXT NOT NULL UNIQUE REFERENCES garage_staff_access(id),
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS garage_auth_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  changed_fields_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS garage_staff_access_role_idx ON garage_staff_access(role);
CREATE INDEX IF NOT EXISTS garage_auth_audit_created_idx ON garage_auth_audit(created_at DESC);