import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { CoreDb } from "./client.js";
import { taskMetadata, type TaskMetadata } from "./schema.js";

// This schema validates input shape only. The caller MUST derive owner from
// a verified Cloud Auth principal before creating a repository call.
const inputSchema = z
  .object({
    ownerAccountRef: z.string().trim().min(1).max(128),
    idempotencyKey: z.string().trim().min(1).max(128),
    definitionHash: z.string().regex(/^[0-9a-f]{64}$/),
    specVersion: z.number().int().min(1),
    description: z.string().trim().min(1).max(1000),
  })
  .strict();

export type TaskMetadataInput = z.infer<typeof inputSchema>;
export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key has a conflicting task definition");
    this.name = "IdempotencyConflictError";
  }
}

export async function createOrFindTaskMetadata(
  db: CoreDb,
  untrusted: TaskMetadataInput,
): Promise<{ task: TaskMetadata; created: boolean }> {
  const input = inputSchema.parse(untrusted);
  const inserted = await db
    .insert(taskMetadata)
    .values(input)
    .onConflictDoNothing({
      target: [taskMetadata.ownerAccountRef, taskMetadata.idempotencyKey],
    })
    .returning();
  const fresh = inserted[0];
  if (fresh) return { task: fresh, created: true };

  // Unique conflict resolution waits for the competing transaction to commit.
  // Do not silently reuse a key with a different payload.
  const found = await db
    .select()
    .from(taskMetadata)
    .where(
      and(
        eq(taskMetadata.ownerAccountRef, input.ownerAccountRef),
        eq(taskMetadata.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  const existing = found[0];
  if (!existing) throw new Error("Concurrent insert resolution yielded no record");
  if (
    existing.definitionHash !== input.definitionHash ||
    existing.specVersion !== input.specVersion ||
    existing.description !== input.description
  ) {
    throw new IdempotencyConflictError();
  }
  return { task: existing, created: false };
}

export async function findTaskMetadataForOwner(
  db: CoreDb,
  ownerAccountRef: string,
  taskId: string,
): Promise<TaskMetadata | undefined> {
  const scope = z.string().trim().min(1).max(128).parse(ownerAccountRef);
  const id = z.string().uuid().parse(taskId);
  const found = await db
    .select()
    .from(taskMetadata)
    .where(and(eq(taskMetadata.ownerAccountRef, scope), eq(taskMetadata.id, id)))
    .limit(1);
  return found[0];
}
