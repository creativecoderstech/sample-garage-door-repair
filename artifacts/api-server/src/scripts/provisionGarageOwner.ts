import { eq } from "drizzle-orm";
import { db, garageStaffUsers } from "@workspace/db";

const clerkUserId = process.argv[2]?.trim();

if (!clerkUserId || !/^user_[A-Za-z0-9]+$/.test(clerkUserId)) {
  console.error("Usage: pnpm provision:garage-owner -- user_<clerk-user-id>");
  process.exit(1);
}

const [owner] = await db
  .insert(garageStaffUsers)
  .values({
    clerkUserId,
    role: "owner",
    active: true,
  })
  .onConflictDoUpdate({
    target: garageStaffUsers.clerkUserId,
    set: {
      role: "owner",
      active: true,
      updatedAt: new Date(),
    },
  })
  .returning();

if (!owner) {
  console.error("Owner provisioning failed.");
  process.exit(1);
}

const [verified] = await db
  .select({
    clerkUserId: garageStaffUsers.clerkUserId,
    role: garageStaffUsers.role,
    active: garageStaffUsers.active,
  })
  .from(garageStaffUsers)
  .where(eq(garageStaffUsers.clerkUserId, clerkUserId))
  .limit(1);

console.log(`Provisioned ${verified.clerkUserId} as active ${verified.role}.`);