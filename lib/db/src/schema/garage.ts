import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const serviceRequests = pgTable("garage_service_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  streetAddress: text("street_address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default("GA"),
  zip: text("zip").notNull(),
  service: text("service").notNull(),
  urgency: text("urgency").notNull(),
  status: text("status").notNull().default("new"),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull().default(""),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessSettings = pgTable("garage_business_settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  serviceArea: text("service_area").notNull(),
  theme: text("theme").notNull(),
  serviceId: text("service_id").notNull(),
  emergencyEnabled: boolean("emergency_enabled").notNull().default(true),
  heroImage: text("hero_image").notNull(),
  galleryImages: jsonb("gallery_images").$type<string[]>().notNull().default([]),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  trustProfile: jsonb("trust_profile").$type<{
    hours: string | null;
    ownerTeam: string | null;
    yearsInBusiness: string | null;
    brandsServiced: string | null;
    paymentOptions: string | null;
    financing: string | null;
    licenseInsurance: string | null;
    warranty: string | null;
  }>().notNull().default({
    hours: null, ownerTeam: null, yearsInBusiness: null, brandsServiced: null,
    paymentOptions: null, financing: null, licenseInsurance: null, warranty: null,
  }),
});

export const googleReviews = pgTable("garage_google_reviews", {
  id: serial("id").primaryKey(),
  googleReviewId: text("google_review_id").notNull().unique(),
  reviewerName: text("reviewer_name").notNull(),
  reviewerPhotoUrl: text("reviewer_photo_url"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  relativeTime: text("relative_time").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garageAuditLogs = pgTable("garage_audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  changedFields: jsonb("changed_fields").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garageStaffUsers = pgTable("garage_staff_users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  role: text("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("garage_staff_users_clerk_user_id_unique").on(table.clerkUserId),
]);

export const garageContent = pgTable("garage_content", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  slug: text("slug").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  imageAlt: text("image_alt").notNull().default(""),
  beforeImageUrl: text("before_image_url").notNull().default(""),
  seoTitle: text("seo_title").notNull().default(""),
  seoDescription: text("seo_description").notNull().default(""),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("draft"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  featured: boolean("featured").notNull().default(false),
  serviceCode: text("service_code").notNull().default(""),
  reviewedSeed: boolean("reviewed_seed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("garage_content_kind_slug_unique").on(table.kind, table.slug),
]);

export const garageSeedEvents = pgTable("garage_seed_events", {
  key: text("key").primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});