import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "./index";

export type GarageStaffRole = "super_admin" | "admin" | "staff";
export type GarageStaffActor = {
  accessId: string;
  userId: string;
  email: string;
  role: GarageStaffRole;
};

declare global {
  namespace Express {
    interface Request {
      garageStaff?: GarageStaffActor;
    }
  }
}

const normalizedEmail = (value: string) => value.trim().toLowerCase();
const environmentName = () => process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_") ? "production" : "development";

type ClerkUser = {
  id: string;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string; verification?: { status?: string } | null }>;
  external_accounts?: Array<{ provider?: string; verification?: { status?: string } | null; email_address?: string }>;
};

async function verifiedGoogleIdentity(userId: string): Promise<{ userId: string; email: string }> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Staff authentication is not configured.");
  if (environmentName() === "production" && secret.startsWith("sk_test_")) {
    throw new Error("Production staff authentication requires Clerk live keys.");
  }
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Unable to verify the signed-in Google account.");
  const user = await response.json() as ClerkUser;
  const primary = user.email_addresses?.find((email) => email.id === user.primary_email_address_id);
  const email = primary?.email_address ? normalizedEmail(primary.email_address) : "";
  const google = user.external_accounts?.some((account) =>
    account.provider === "oauth_google" &&
    account.verification?.status === "verified" &&
    (!account.email_address || normalizedEmail(account.email_address) === email)
  );
  if (!email || primary?.verification?.status !== "verified" || !google) {
    throw new Error("Use a Google account with a verified primary email address.");
  }
  return { userId: user.id, email };
}

async function redeemOrRead(userId: string): Promise<GarageStaffActor | null> {
  const identity = await verifiedGoogleIdentity(userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`garage-auth:${environmentName()}`]);
    let row = (await client.query(
      `SELECT id, email, clerk_user_id, role FROM garage_staff_access
       WHERE clerk_user_id=$1 OR (clerk_user_id IS NULL AND lower(email)=lower($2))
       ORDER BY clerk_user_id NULLS LAST LIMIT 1 FOR UPDATE`,
      [identity.userId, identity.email],
    )).rows[0];
    const bootstrapEmail = normalizedEmail(process.env.GARAGE_BOOTSTRAP_EMAIL || "");
    const claimed = (await client.query(
      "SELECT 1 FROM garage_auth_bootstrap WHERE environment=$1",
      [environmentName()],
    )).rowCount;
    if (!claimed && bootstrapEmail && identity.email === bootstrapEmail) {
        const id = row?.id || crypto.randomUUID();
        if (row) {
          row = (await client.query(
            `UPDATE garage_staff_access SET clerk_user_id=$1,role='super_admin',
                    protected_owner=true,redeemed_at=now()
             WHERE id=$2 RETURNING id,email,clerk_user_id,role`,
            [identity.userId, id],
          )).rows[0];
        } else {
        row = (await client.query(
          `INSERT INTO garage_staff_access
             (id,email,clerk_user_id,role,protected_owner,redeemed_at)
           VALUES ($1,$2,$3,'super_admin',true,now())
           RETURNING id,email,clerk_user_id,role`,
          [id, identity.email, identity.userId],
        )).rows[0];
        }
        await client.query(
          "INSERT INTO garage_auth_bootstrap(environment,clerk_user_id,access_id) VALUES ($1,$2,$3)",
          [environmentName(), identity.userId, id],
        );
        await client.query(
          `INSERT INTO garage_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields)
           VALUES ($1,'super_admin','staff_access.bootstrap','staff_access',$2,'["email","role"]'::jsonb)`,
          [identity.userId, id],
        );
    } else if (row && !row.clerk_user_id) {
      row = (await client.query(
        `UPDATE garage_staff_access SET clerk_user_id=$1,redeemed_at=now()
         WHERE id=$2 AND clerk_user_id IS NULL RETURNING id,email,clerk_user_id,role`,
        [identity.userId, row.id],
      )).rows[0];
      await client.query(
        `INSERT INTO garage_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields)
         VALUES ($1,$2,'staff_access.redeemed','staff_access',$3,'["clerk_user_id"]'::jsonb)`,
        [identity.userId, row.role, row.id],
      );
    }
    await client.query("COMMIT");
    return row ? { accessId: row.id, userId: identity.userId, email: row.email, role: row.role } : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const rank: Record<GarageStaffRole, number> = { staff: 1, admin: 2, super_admin: 3 };

export async function authorizeGarageUser(userId: string, minimum: GarageStaffRole = "staff") {
  const actor = await redeemOrRead(userId);
  if (!actor) throw Object.assign(new Error("This Google account has not been granted staff access."), { status: 403 });
  if (rank[actor.role] < rank[minimum]) throw Object.assign(new Error("Your staff role cannot perform this action."), { status: 403 });
  return actor;
}

export function requireGarageRole(minimum: GarageStaffRole = "staff") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      const userId = auth?.userId || auth?.sessionClaims?.sub;
      if (!userId) return res.status(401).json({ error: "Sign in with Google to continue." });
      const actor = await authorizeGarageUser(userId, minimum);
      req.garageStaff = actor;
      return next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Staff authentication failed.";
      const explicitStatus = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
      return res.status(explicitStatus || (message.includes("not configured") || message.includes("live keys") ? 503 : 401)).json({ error: message });
    }
  };
}

export async function listGarageAccess() {
  const result = await pool.query(
    `SELECT id,email,role,clerk_user_id IS NOT NULL AS redeemed,protected_owner,
            created_at,redeemed_at FROM garage_staff_access ORDER BY protected_owner DESC,created_at`,
  );
  return result.rows.map((row) => ({
    id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending",
    protectedOwner: row.protected_owner, createdAt: row.created_at, redeemedAt: row.redeemed_at,
  }));
}

export async function grantGarageAccess(actor: GarageStaffActor, emailValue: string, role: "admin" | "staff") {
  const email = normalizedEmail(emailValue);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = (await client.query(
      "SELECT protected_owner FROM garage_staff_access WHERE lower(email)=lower($1) FOR UPDATE",
      [email],
    )).rows[0];
    if (existing?.protected_owner) throw Object.assign(new Error("The bootstrap owner's role cannot be changed."), { status: 409 });
    const id = crypto.randomUUID();
    const row = (await client.query(
      `INSERT INTO garage_staff_access(id,email,role,granted_by)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(email) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by
       RETURNING id,email,role,clerk_user_id IS NOT NULL AS redeemed`,
      [id, email, role, actor.userId],
    )).rows[0];
    await client.query(
      `INSERT INTO garage_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields)
       VALUES($1,$2,'staff_access.granted','staff_access',$3,'["email","role"]'::jsonb)`,
      [actor.userId, actor.role, row.id],
    );
    await client.query("COMMIT");
    return { id: row.id, email: row.email, role: row.role, status: row.redeemed ? "active" : "pending" };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function revokeGarageAccess(actor: GarageStaffActor, id: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const target = (await client.query(
      "SELECT id,protected_owner FROM garage_staff_access WHERE id=$1 FOR UPDATE", [id],
    )).rows[0];
    if (!target) throw Object.assign(new Error("Access record not found."), { status: 404 });
    if (target.protected_owner) throw Object.assign(new Error("The bootstrap owner cannot be revoked."), { status: 409 });
    await client.query("DELETE FROM garage_staff_access WHERE id=$1", [id]);
    await client.query(
      `INSERT INTO garage_audit_logs(actor_user_id,actor_role,action,resource_type,resource_id,changed_fields)
       VALUES($1,$2,'staff_access.revoked','staff_access',$3,'[]'::jsonb)`,
      [actor.userId, actor.role, id],
    );
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}