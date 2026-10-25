(() => {
  const form = document.getElementById('enquiry-form');
  if (!form || form.dataset.ready) return;
  form.dataset.ready = 'true';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('enquiry-status');
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.dataset.state = '';
    form.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send your enquiry. Please try again.');
      form.reset();
      status.dataset.state = 'success';
      status.textContent = `Thank you. Your enquiry has been received (reference #${data.reference}). Our team will be in touch.`;
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error instanceof TypeError ? 'Connection interrupted. Please try again or email mobinimpex@hotmail.com.' : error.message;
    } finally {
      button.disabled = false;
      button.innerHTML = 'Send enquiry <span aria-hidden="true">↗</span>';
      form.removeAttribute('aria-busy');
      status.focus({ preventScroll: true });
    }
  });
})();
