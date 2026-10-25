import { saveEnquiry } from '../../../lib/db.js';
import { validateEnquiry } from '../../../lib/enquiries.js';
import { json, rateLimited, readJson, sameOrigin } from '../../../lib/http.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Please submit the form from this website.' }, 403);
  let input;
  try { input = await readJson(request); } catch { return json({ error: 'Invalid form submission.' }, 400); }
  const result = validateEnquiry(input);
  if (result.error) return json({ error: result.error }, 400);
  if (input.website) return json({ error: 'Unable to submit this enquiry.' }, 400);
  if (rateLimited(`contact:${result.data.email.toLowerCase()}`, 5, 15 * 60 * 1000) || rateLimited('contact:global', 100, 60 * 1000)) return json({ error: 'Too many enquiries. Please try again later.' }, 429);
  try {
    const row = await saveEnquiry(result.data);
    return json({ success: true, reference: String(row.id) }, 201);
  } catch {
    return json({ error: 'Your enquiry could not be saved. Please try again later or email mobinimpex@hotmail.com.' }, 503);
  }
}
