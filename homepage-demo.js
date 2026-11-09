'use strict';

(() => {
  const form = document.querySelector('#homepage-demo-form');
  if (!form) return;

  const topic = form.elements.namedItem('topic');
  const context = form.elements.namedItem('additionalContext');
  const contextLabel = document.querySelector('#inquiry-context-label');
  const contextOptional = document.querySelector('#inquiry-context-optional');
  const toolGuide = document.querySelector('#inquiry-tool-guide');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.inquiry-status');
  const fallback = form.querySelector('.inquiry-fallback');
  const buttonLabel = button.textContent;
  let pending = false;

  const isToolRequest = () => topic.value === 'request-tool';

  function updateButtonLabel() {
    if (!pending) button.textContent = isToolRequest() ? 'Send tool request' : buttonLabel;
  }

  function updateTopic() {
    const toolRequest = isToolRequest();
    context.required = toolRequest;
    context.setCustomValidity('');
    contextLabel.textContent = toolRequest ? 'Describe the workflow' : 'What are you working on?';
    contextOptional.hidden = toolRequest;
    toolGuide.hidden = !toolRequest;
    if (toolRequest) context.setAttribute('aria-describedby', toolGuide.id);
    else context.removeAttribute('aria-describedby');
    updateButtonLabel();
  }

  function selectTopic(value) {
    if ([...topic.options].some(option => option.value === value)) topic.value = value;
    updateTopic();
  }

  selectTopic(document.body.dataset.inquiry);
  topic.addEventListener('change', updateTopic);
  context.addEventListener('input', () => context.setCustomValidity(''));
  for (const link of document.querySelectorAll('a[href="#request-demo"][data-inquiry]')) {
    link.addEventListener('click', () => selectTopic(link.dataset.inquiry));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const toolRequest = isToolRequest();
    context.setCustomValidity(toolRequest && !context.value.trim() ? 'Describe the workflow for the tool you’re requesting.' : '');
    if (!form.reportValidity()) return;

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
      status.textContent = toolRequest
        ? 'Thanks. We received your tool request. We’ll review the workflow and follow up by email.'
        : 'Thanks. We received your request and will follow up by email.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error instanceof TypeError || ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'We couldn’t connect. Your entries are still here. Please try again.'
        : error.message;
      fallback.hidden = false;
    } finally {
      pending = false;
      button.disabled = false;
      updateButtonLabel();
    }
  });

  button.disabled = false;
})();
