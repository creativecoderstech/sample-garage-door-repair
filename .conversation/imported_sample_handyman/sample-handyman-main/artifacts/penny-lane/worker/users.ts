export type UserRole = "super_admin" | "admin" | "member";
export type UserStatus = "invited" | "active" | "disabled";

export type UserRow = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  google_sub: string | null;
  role: UserRole;
  status: UserStatus;
  is_system: number;
  invited_by: number | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type PublicUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  isSystem: boolean;
  invitedBy: number | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export function serializeUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    isSystem: row.is_system === 1,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
      .bind(email.trim().toLowerCase())
      .first<UserRow>()) ?? null
  );
}

export async function findUserById(
  db: D1Database,
  id: number,
): Promise<UserRow | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first<UserRow>()) ?? null
  );
}

export async function listUsers(db: D1Database): Promise<UserRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM users
       ORDER BY
         CASE role
           WHEN 'super_admin' THEN 0
           WHEN 'admin' THEN 1
           ELSE 2
         END,
         email ASC`,
    )
    .all<UserRow>();
  return result.results ?? [];
}

/** Add an Admin/Member to the allowlist (active; can sign in with Google immediately). */
export async function createUser(
  db: D1Database,
  args: {
    email: string;
    role: "admin" | "member";
    name?: string;
    createdBy: number;
  },
): Promise<UserRow> {
  const email = args.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `INSERT INTO users (email, name, role, status, is_system, invited_by, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 0, ?, ?, ?)`,
    )
    .bind(email, args.name?.trim() || null, args.role, args.createdBy, now, now)
    .run();
  const id = Number(result.meta.last_row_id);
  const row = await findUserById(db, id);
  if (!row) throw new Error("Failed to create user");
  return row;
}

export async function updateUser(
  db: D1Database,
  id: number,
  patch: {
    name?: string | null;
    role?: "admin" | "member";
    status?: UserStatus;
  },
): Promise<UserRow | null> {
  const existing = await findUserById(db, id);
  if (!existing || existing.is_system === 1) return null;

  const name = patch.name !== undefined ? patch.name : existing.name;
  const role = patch.role ?? (existing.role === "super_admin" ? "admin" : existing.role);
  if (role === "super_admin") return null;
  const status = patch.status ?? existing.status;
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE users
       SET name = ?, role = ?, status = ?, updated_at = ?
       WHERE id = ? AND is_system = 0`,
    )
    .bind(name, role, status, now, id)
    .run();

  return findUserById(db, id);
}

export async function deleteUser(db: D1Database, id: number): Promise<boolean> {
  const existing = await findUserById(db, id);
  if (!existing || existing.is_system === 1) return false;
  const result = await db
    .prepare("DELETE FROM users WHERE id = ? AND is_system = 0")
    .bind(id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function activateUserFromGoogle(
  db: D1Database,
  user: UserRow,
  profile: { sub: string; name?: string; picture?: string },
): Promise<UserRow> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users
       SET google_sub = ?,
           name = COALESCE(?, name),
           avatar_url = COALESCE(?, avatar_url),
           status = 'active',
           last_login_at = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      profile.sub,
      profile.name?.trim() || null,
      profile.picture || null,
      now,
      now,
      user.id,
    )
    .run();
  const updated = await findUserById(db, user.id);
  if (!updated) throw new Error("Failed to activate user");
  return updated;
}
