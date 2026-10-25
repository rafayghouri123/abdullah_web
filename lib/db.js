import { neon } from '@neondatabase/serverless';

let connection;
let initialized;

export function databaseConfigured() { return Boolean(process.env.DATABASE_URL?.trim()); }

async function database() {
  if (!databaseConfigured()) throw new Error('Database is not configured');
  const sql = neon(process.env.DATABASE_URL);
  if (connection !== process.env.DATABASE_URL) { connection = process.env.DATABASE_URL; initialized = undefined; }
  // Idempotent setup on first use; rejected setup is retried on the next request.
  initialized ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS contact_enquiries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    enquiry_type VARCHAR(80) NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    // Existing enquiries stay open; safe for databases created before statuses.
    await sql`ALTER TABLE contact_enquiries ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`;
  })().catch(error => { initialized = undefined; throw error; });
  await initialized;
  return sql;
}

export async function saveEnquiry({ fullName, email, type, message }) {
  const sql = await database();
  const [row] = await sql`INSERT INTO contact_enquiries (full_name, email, enquiry_type, message)
    VALUES (${fullName}, ${email}, ${type}, ${message}) RETURNING id`;
  return row;
}

export async function listEnquiries(requestedPage = 1) {
  const sql = await database();
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM contact_enquiries`;
  const pages = Math.max(1, Math.ceil(count / 20));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  const rows = await sql`SELECT id, full_name, email, enquiry_type, message, created_at, resolved_at
    FROM contact_enquiries ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`;
  return { rows, count, page, pages };
}

export async function setEnquiryResolved(id, resolved) {
  const sql = await database();
  const [row] = await sql`UPDATE contact_enquiries
    SET resolved_at = CASE WHEN ${resolved}::boolean THEN COALESCE(resolved_at, NOW()) ELSE NULL END
    WHERE id = ${id} RETURNING id, resolved_at`;
  return row;
}
