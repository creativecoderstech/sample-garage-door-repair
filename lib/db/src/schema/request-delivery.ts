import { boolean, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const garageRequestSubmissions = pgTable("garage_request_submissions", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  requestId: integer("request_id").notNull(),
  uploadCapability: text("upload_capability").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("garage_request_submissions_request_id_unique").on(table.requestId),
]);

export const garageRequestAttachments = pgTable("garage_request_attachments", {
  id: text("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  objectKey: text("object_key").notNull(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  prepareKey: text("prepare_key").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("garage_request_attachments_object_key_unique").on(table.objectKey),
  uniqueIndex("garage_request_attachments_prepare_unique").on(table.requestId, table.prepareKey),
]);

export const garageNotificationSettings = pgTable("garage_notification_settings", {
  id: integer("id").primaryKey().default(1),
  webhookUrl: text("webhook_url"),
  enabled: boolean("enabled").notNull().default(false),
  destinationVerified: boolean("destination_verified").notNull().default(false),
  testedAt: timestamp("tested_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garageNotificationOutbox = pgTable("garage_notification_outbox", {
  id: text("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  status: text("status").notNull().default("unconfigured"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("garage_notification_outbox_request_id_unique").on(table.requestId),
]);

export const garagePersistentRateLimits = pgTable("garage_persistent_rate_limits", {
  rateKey: text("rate_key").notNull(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.rateKey, table.windowStart] }),
]);