'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      window.location.assign('/admin');
    } catch (error) { setError(error instanceof TypeError ? 'Connection interrupted. Please try again.' : error.message); setPending(false); }
  }
  return <form onSubmit={submit} aria-busy={pending}>
    <div className="mi-field"><label htmlFor="admin-username">Username</label><input id="admin-username" name="username" autoComplete="username" maxLength={120} required /></div>
    <div className="mi-field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={256} required /></div>
    <button type="submit" className="mi-button" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">↗</span></button>
    <p className="mi-status" data-state="error" role="alert">{error}</p>
  </form>;
}
