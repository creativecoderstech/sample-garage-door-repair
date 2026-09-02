CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT,
  avatar_url TEXT,
  google_sub TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  is_system INTEGER NOT NULL DEFAULT 0,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx ON users(google_sub)
  WHERE google_sub IS NOT NULL;

-- Immutable seed Super Admin (cannot be deleted/edited via API).
INSERT OR IGNORE INTO users (email, name, role, status, is_system)
VALUES (
  'creativecoderstech@gmail.com',
  'Creative Coders Tech',
  'super_admin',
  'active',
  1
);
