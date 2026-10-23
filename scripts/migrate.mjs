// Runs on every Vercel build: applies supabase/schema.sql (idempotent) and,
// only when the database is empty, supabase/seed.sql.
// Uses the Postgres URL that the Vercel ⇄ Supabase integration injects.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!raw) {
  console.log('[migrate] no Postgres URL in env — skipping database setup');
  process.exit(0);
}
const url = new URL(raw);
url.searchParams.delete('sslmode');
url.searchParams.delete('supa');
const local = ['localhost', '127.0.0.1'].includes(url.hostname) || url.hostname.startsWith('/');
const client = new pg.Client({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
  console.log('[migrate] schema applied');
  const { rows } = await client.query('select count(*)::int as n from public.managers');
  if (rows[0].n === 0) {
    await client.query(readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
    console.log('[migrate] seed data loaded');
  } else {
    console.log(`[migrate] ${rows[0].n} managers already exist — seed skipped`);
  }
} catch (e) {
  console.error('[migrate] FAILED:', e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
