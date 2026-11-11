import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Cloud Core owns only a new local metadata record. This does not mirror Cloud Pi Runs.
export const taskMetadata = pgTable(
  "task_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAccountRef: varchar("owner_account_ref", { length: 128 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    definitionHash: varchar("definition_hash", { length: 64 }).notNull(),
    specVersion: integer("spec_version").notNull().default(1),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_metadata_owner_key_uq").on(table.ownerAccountRef, table.idempotencyKey),
    check("task_metadata_owner_nonblank", sql.raw('length(trim("owner_account_ref")) > 0')),
    check("task_metadata_key_nonblank", sql.raw('length(trim("idempotency_key")) > 0')),
    check("task_metadata_hash_sha256", sql.raw("\"definition_hash\" ~ '^[0-9a-f]{64}$'")),
    check("task_metadata_spec_positive", sql.raw('"spec_version" >= 1')),
    check("task_metadata_description_nonblank", sql.raw('length(trim("description")) > 0')),
  ],
);
export type TaskMetadata = typeof taskMetadata.$inferSelect;
