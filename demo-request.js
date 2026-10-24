'use strict';

(() => {
  const form = document.querySelector('#tool-demo-form');
  if (!form) return;
  const message = document.querySelector('#demo-message');
  const submit = form.querySelector('button[type="submit"]');
  const interests = [...form.querySelectorAll('input[name="interests"]')];
  const selectedTool = document.querySelector('#demo-selected-tool');
  let pending = false;

  for (const link of document.querySelectorAll('[data-demo-tool]')) {
    link.addEventListener('click', () => {
      const input = interests.find(input => input.value === link.dataset.demoTool);
      if (input) input.checked = true;
      interests[0]?.setCustomValidity('');
      selectedTool.textContent = 'Your tool is selected below. Add your contact details to request a free demo.';
      message.textContent = '';
    });
  }

  form.addEventListener('change', () => {
    interests[0]?.setCustomValidity('');
    message.textContent = '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    message.classList.remove('success');
    message.textContent = '';
    const selected = interests.filter(input => input.checked).map(input => input.value);
    interests[0]?.setCustomValidity(selected.length ? '' : 'Choose at least one tool for your demo.');
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload = {
      companyName: String(data.get('companyName') || '').trim(),
      contactName: String(data.get('contactName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      phone: String(data.get('phone') || '').trim(),
      userCount: Number(data.get('userCount')),
      interests: selected,
      additionalContext: String(data.get('additionalContext') || '').trim(),
      website: String(data.get('website') || '').trim()
    };

    pending = true;
    submit.disabled = true;
    submit.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    message.textContent = 'Sending your free-demo request…';
    try {
      const response = await fetch('https://workspace.enginecore.org/api/public/demo-interest', {
        method: 'POST',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your request could not be sent. Please try again.');
      form.reset();
      interests[0]?.setCustomValidity('');
      selectedTool.textContent = '';
      message.classList.add('success');
      message.textContent = 'Thank you. Your free-demo request has been received. We’ll follow up using the contact details you provided.';
    } catch (error) {
      message.textContent = error instanceof TypeError || ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'We could not connect. Your entries are still here; please try again or use the demo request form in the EngineCore dashboard.'
        : error.message;
    } finally {
      pending = false;
      submit.disabled = false;
      submit.textContent = 'Request a free demo';
      form.removeAttribute('aria-busy');
    }
  });
})();
