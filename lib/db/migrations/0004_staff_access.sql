-- Additive PostgreSQL staff authorization. Authentication identities remain in
-- Clerk; this table is the request-time authorization source of truth.
CREATE TABLE IF NOT EXISTS garage_staff_access (
  id text PRIMARY KEY,
  email text NOT NULL,
  clerk_user_id text,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
  protected_owner boolean NOT NULL DEFAULT false,
  granted_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  redeemed_at timestamp with time zone,
  UNIQUE (email),
  UNIQUE (clerk_user_id)
);

CREATE TABLE IF NOT EXISTS garage_auth_bootstrap (
  environment text PRIMARY KEY,
  clerk_user_id text NOT NULL UNIQUE,
  access_id text NOT NULL UNIQUE REFERENCES garage_staff_access(id),
  claimed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garage_staff_access_role_idx
  ON garage_staff_access (role);