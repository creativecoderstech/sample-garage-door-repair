import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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