import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, garageStaffUsers } from "@workspace/db";

export type GarageStaffRole = "staff" | "manager" | "owner";

export interface GarageStaffPrincipal {
  userId: string;
  role: GarageStaffRole;
}

declare global {
  namespace Express {
    interface Request {
      staffPrincipal?: GarageStaffPrincipal;
    }
  }
}

function getConfiguredOwnerIds() {
  return new Set(
    (process.env.GARAGE_OWNER_USER_IDS ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

async function resolveStaffPrincipal(
  userId: string,
): Promise<GarageStaffPrincipal | undefined> {
  const [existing] = await db
    .select()
    .from(garageStaffUsers)
    .where(and(eq(garageStaffUsers.clerkUserId, userId), eq(garageStaffUsers.active, true)))
    .limit(1);

  if (existing) {
    const role = existing.role;
    return {
      userId,
      role: role === "manager" || role === "owner" ? role : "staff",
    };
  }

  const configuredOwnerIds = getConfiguredOwnerIds();
  if (configuredOwnerIds.size > 0) {
    if (!configuredOwnerIds.has(userId)) return undefined;
    const [owner] = await db
      .insert(garageStaffUsers)
      .values({ clerkUserId: userId, role: "owner" })
      .onConflictDoNothing()
      .returning();
    return owner ? { userId, role: "owner" } : resolveStaffPrincipal(userId);
  }

  return undefined;
}

export async function requireStaffAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Staff authentication is required." });
    return;
  }

  const principal = await resolveStaffPrincipal(userId);
  if (!principal) {
    res.status(403).json({ error: "This account has not been provisioned for staff access." });
    return;
  }

  req.staffPrincipal = principal;
  next();
}

export function requireStaffRole(...allowedRoles: GarageStaffRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.staffPrincipal) {
      await requireStaffAuth(req, res, () => undefined);
      if (!req.staffPrincipal) return;
    }

    if (!allowedRoles.includes(req.staffPrincipal.role)) {
      res.status(403).json({ error: "You do not have permission for this action." });
      return;
    }

    next();
  };
}