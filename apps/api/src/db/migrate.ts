import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDbContext } from "./client.js";

const context = createDbContext();
if (!context) throw new Error("Production database is not configured");

try {
  await migrate(context.db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle/", import.meta.url)),
  });
  console.info(JSON.stringify({ event: "database_migration_completed" }));
} catch {
  console.error(JSON.stringify({ event: "database_migration_failed" }));
  process.exitCode = 1;
} finally {
  await context.close();
}
