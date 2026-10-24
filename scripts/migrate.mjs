// Runs on every Vercel build: applies supabase/schema.sql (idempotent) and,
// only when the database is empty, supabase/seed.sql.
// Uses the Postgres URL that the Vercel ⇄ Supabase integration injects.
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

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
    await client.query(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')); // normalize seed into current columns
  } else {
    console.log(`[migrate] ${rows[0].n} managers already exist — seed skipped`);
  }
} catch (e) {
  console.error('[migrate] FAILED:', e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

// Private storage bucket for receipt photos (server uploads with the service role)
const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (sbUrl && sbKey) {
  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const { error } = await admin.storage.createBucket('receipts', { public: false, fileSizeLimit: '10MB' });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.error('[migrate] receipts bucket FAILED:', error.message);
    process.exit(1);
  }
  console.log('[migrate] receipts bucket ready');
}
