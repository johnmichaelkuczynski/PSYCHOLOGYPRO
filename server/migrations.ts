import { pool } from "./db";

const migrations = [
  {
    version: "0001_core_tables",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username varchar NOT NULL UNIQUE,
        password varchar NOT NULL,
        credits integer NOT NULL DEFAULT 0,
        stripe_customer_id varchar,
        created_at timestamp
      );

      CREATE TABLE IF NOT EXISTS analyses (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        type varchar NOT NULL,
        text_content text NOT NULL,
        additional_context text,
        llm_provider varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'pending',
        results jsonb,
        saved boolean NOT NULL DEFAULT false,
        user_id integer REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS discussions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        analysis_id varchar NOT NULL,
        message text NOT NULL,
        sender varchar NOT NULL,
        created_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS analysis_settings (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        key varchar NOT NULL UNIQUE,
        value jsonb NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount integer NOT NULL,
        credits integer NOT NULL,
        stripe_payment_intent_id varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      );
    `,
  },
  {
    version: "0002_database_file_storage",
    sql: `
      CREATE TABLE IF NOT EXISTS stored_files (
        id varchar PRIMARY KEY,
        original_name text NOT NULL,
        content_type varchar NOT NULL,
        size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
        data bytea NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS stored_files_created_at_idx
        ON stored_files (created_at DESC);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(714203981)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_migrations (
        version varchar PRIMARY KEY,
        applied_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    for (const migration of migrations) {
      const applied = await client.query(
        "SELECT 1 FROM application_migrations WHERE version = $1",
        [migration.version],
      );
      if (applied.rowCount) continue;

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO application_migrations (version) VALUES ($1)",
          [migration.version],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(714203981)").catch(() => undefined);
    client.release();
  }
}
