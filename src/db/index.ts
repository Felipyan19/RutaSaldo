import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function secureConnectionString(connectionString: string) {
  const url = new URL(connectionString);

  // Neon requires TLS. Setting the mode explicitly preserves today's secure
  // certificate and hostname verification behavior across future pg upgrades.
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.delete("uselibpqcompat");

  return url.toString();
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = new Pool({
    connectionString: secureConnectionString(connectionString),
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  attachDatabasePool(pool);

  return drizzle(pool, { schema });
}

type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as typeof globalThis & {
  rutasaldoDb?: Database;
};

export function getDb() {
  globalForDb.rutasaldoDb ??= createDb();
  return globalForDb.rutasaldoDb;
}
