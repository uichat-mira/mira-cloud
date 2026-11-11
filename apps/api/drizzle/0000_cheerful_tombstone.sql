CREATE TABLE "task_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_ref" varchar(128) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"definition_hash" varchar(64) NOT NULL,
	"spec_version" integer DEFAULT 1 NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_metadata_owner_nonblank" CHECK (length(trim("owner_account_ref")) > 0),
	CONSTRAINT "task_metadata_key_nonblank" CHECK (length(trim("idempotency_key")) > 0),
	CONSTRAINT "task_metadata_hash_sha256" CHECK ("definition_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "task_metadata_spec_positive" CHECK ("spec_version" >= 1),
	CONSTRAINT "task_metadata_description_nonblank" CHECK (length(trim("description")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_metadata_owner_key_uq" ON "task_metadata" USING btree ("owner_account_ref","idempotency_key");