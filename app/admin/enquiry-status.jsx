'use client';

import { useState } from 'react';

export default function EnquiryStatus({ id, initialResolvedAt }) {
  const [resolvedAt, setResolvedAt] = useState(initialResolvedAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const resolved = Boolean(resolvedAt);

  async function updateStatus() {
    if (pending) return;
    setPending(true);
    setError('');
    setAnnouncement('');
    try {
      const response = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save this status.');
      setResolvedAt(data.resolvedAt);
      setAnnouncement(data.resolvedAt ? 'Enquiry marked as resolved.' : 'Enquiry reopened.');
    } catch (error) {
      setError(error instanceof TypeError ? 'Connection interrupted. Please try again.' : error.message);
    } finally { setPending(false); }
  }

  return <div className="mi-enquiry-status">
    <div className="mi-enquiry-actions">
      <span className="mi-status-badge" data-resolved={resolved}>{resolved ? '✓ Resolved' : 'Open'}</span>
      <button type="button" className="mi-button mi-resolve-button" onClick={updateStatus} disabled={pending} aria-label={`${resolved ? 'Reopen' : 'Mark as resolved'} enquiry #${id}`}>
        {pending ? 'Saving…' : resolved ? 'Reopen enquiry' : 'Mark as resolved'}
      </button>
    </div>
    <span className="mi-sr-only" role="status">{announcement}</span>
    {error && <p className="mi-status" data-state="error" role="alert">{error}</p>}
  </div>;
}
