'use strict';

(() => {
  const form = document.querySelector('#homepage-demo-form');
  if (!form) return;

  const topic = form.elements.namedItem('topic');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.inquiry-status');
  const fallback = form.querySelector('.inquiry-fallback');
  const buttonLabel = button.textContent;
  let pending = false;

  function selectTopic(value) {
    if ([...topic.options].some(option => option.value === value)) topic.value = value;
  }

  selectTopic(document.body.dataset.inquiry);
  for (const link of document.querySelectorAll('a[href="#request-demo"][data-inquiry]')) {
    link.addEventListener('click', () => selectTopic(link.dataset.inquiry));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;

    const fields = new FormData(form);
    const fieldText = name => String(fields.get(name) || '').trim();
    const note = fieldText('additionalContext');
    const interest = topic.selectedOptions[0].textContent;
    const payload = {
      contactName: fieldText('contactName'),
      companyName: fieldText('companyName'),
      email: fieldText('email'),
      userCount: Number(fields.get('userCount')),
      interests: [topic.value === 'fire-protection' ? 'semi_annual_forms' : 'site_workspace'],
      additionalContext: ['Homepage inquiry: ' + interest, note].filter(Boolean).join('\n\n'),
      website: fieldText('website')
    };

    pending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.dataset.state = 'pending';
    status.textContent = 'Sending your request…';
    fallback.hidden = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (response.status !== 201 || result.ok !== true) {
        throw new Error(result.error || 'Your request could not be sent. Please try again.');
      }
      form.reset();
      selectTopic(document.body.dataset.inquiry);
      status.dataset.state = 'success';
      status.textContent = 'Thanks. We received your request and will follow up by email.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error instanceof TypeError || ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'We couldn’t connect. Your entries are still here. Please try again.'
        : error.message;
      fallback.hidden = false;
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = buttonLabel;
    }
  });

  button.disabled = false;
})();
