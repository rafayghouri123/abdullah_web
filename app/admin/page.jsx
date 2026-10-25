import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '../../lib/auth.js';
import { databaseConfigured, listEnquiries } from '../../lib/db.js';
import LoginForm from './login-form';
import EnquiryStatus from './enquiry-status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Enquiries | MOBIN IMPEX Admin', robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }) {
  const authenticated = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  let result;
  let failed = false;
  if (authenticated && databaseConfigured()) {
    const params = await searchParams;
    try { result = await listEnquiries(Number(params.page || 1)); } catch { failed = true; }
  }
  const dates = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' });
  return <main className="mi-admin">
    <nav className="mi-admin-nav" aria-label="Admin navigation"><a className="mi-admin-brand" href="/">MOBIN IMPEX</a>{authenticated ? <form action="/api/admin/logout" method="post"><button className="mi-button">Sign out ↗</button></form> : <a href="/">Back to website ↗</a>}</nav>
    {!authenticated ? <section className="mi-admin-login"><span className="mi-eyebrow">ADMIN / PRIVATE ACCESS</span><h1>Welcome back.</h1><p>Sign in to view shipment enquiries and messages from your website.</p><LoginForm /></section> : <>
      <header className="mi-admin-heading"><div><span className="mi-eyebrow">ADMIN / YOUR INBOX</span><h1>Enquiries<span style={{ color: '#0016cb' }}>.</span></h1><p>Every conversation starts here. Newest messages first.</p></div>{result && <div><div className="mi-count">{result.count}</div><span className="mi-eyebrow">TOTAL ENQUIRIES</span></div>}</header>
      {!databaseConfigured() ? <section className="mi-notice"><h2>Connect your enquiry inbox</h2><p>Add your Neon connection string to <code>DATABASE_URL</code> in <code>.env</code>, then restart the server. The enquiries table will be created automatically.</p></section> : failed ? <section className="mi-notice" role="alert"><h2>The inbox is temporarily unavailable</h2><p>Check the database connection and try again.</p><a className="mi-button" href="/admin">Try again ↗</a></section> : result.count === 0 ? <section className="mi-notice"><h2>You’re ready for your first enquiry.</h2><p>Messages submitted through the contact form will appear here.</p><a href="/#contact">View contact form ↗</a></section> : <>
        <div className="mi-enquiries">{result.rows.map(row => <article className="mi-enquiry" key={String(row.id)}><div className="mi-enquiry-meta"><span className="mi-eyebrow">ENQUIRY / #{String(row.id)}</span><h2>{row.full_name}</h2><a href={`mailto:${row.email}`}>{row.email}</a><time dateTime={new Date(row.created_at).toISOString()}>{dates.format(new Date(row.created_at))} PKT</time></div><div className="mi-enquiry-message"><span className="mi-tag">{row.enquiry_type}</span><p>{row.message}</p><EnquiryStatus id={String(row.id)} initialResolvedAt={row.resolved_at ? new Date(row.resolved_at).toISOString() : null} /></div></article>)}</div>
        <nav className="mi-pagination" aria-label="Enquiry pages"><span>{result.page > 1 && <a href={`/admin?page=${result.page - 1}`}>← Previous</a>}</span><span>Page {result.page} of {result.pages}</span><span>{result.page < result.pages && <a href={`/admin?page=${result.page + 1}`}>Next →</a>}</span></nav>
      </>}
    </>}
  </main>;
}
