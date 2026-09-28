'use strict';

(() => {
  const form = document.querySelector('#commercial-review-form');
  if (!form) return;

  const API = 'https://workspace.enginecore.org/api/public/commercial-review-intakes';
  const MAX_FILE_BYTES = 250 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
  const MAX_FILE_COUNT = 16;
  const roles = ['project_documents','reviewer_comments','site_photos','manufacturer_documents','other'];
  const filesByRole = new Map(roles.map(role => [role, []]));
  const message = document.querySelector('#form-message');
  const submitPanel = document.querySelector('#submit-panel');
  const submitButton = document.querySelector('#submit-review');
  const progress = document.querySelector('#upload-progress');
  const progressLabel = document.querySelector('#progress-label');
  const progressPercent = document.querySelector('#progress-percent');
  const progressMeter = document.querySelector('#progress-meter');
  const serviceSelect = document.querySelector('#review-service');
  let busy = false;
  let complete = false;

  const requestedService = new URLSearchParams(window.location.search).get('service');
  if (requestedService === 'site-compliance' || requestedService === 'submittal') serviceSelect.value = requestedService;

  function updateServiceSummary() {
    const siteReview = serviceSelect.value === 'site-compliance';
    document.querySelector('#selected-review-price').textContent = siteReview ? '$199 · Site Compliance Review' : '$99 · submittal technical review';
    document.querySelector('#selected-review-next').textContent = siteReview ? 'Travel and optional pipe work quoted separately' : 'Scope confirmed before work begins';
    document.querySelector('#payment-copy').textContent = siteReview
      ? 'No payment is collected here. The $199 base review, any travel, and optional pipe services are confirmed before scheduling.'
      : 'No payment is collected here. EngineCore will confirm the $99 technical review scope and arrange payment before work begins.';
  }

  const totalFiles = () => [...filesByRole.values()].flat();

  function fileSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
    return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  }

  function showError(text) {
    message.classList.remove('success');
    message.textContent = text;
    return false;
  }

  function renderFiles(role) {
    const slot = document.querySelector(`.document-slot[data-role="${role}"]`);
    const list = slot.querySelector('.file-list');
    list.replaceChildren();
    filesByRole.get(role).forEach((file, index) => {
      const pill = document.createElement('span');
      pill.className = 'file-pill';
      const label = document.createElement('span');
      label.textContent = `${file.name} · ${fileSize(file.size)}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', event => {
        event.preventDefault();
        if (busy) return;
        filesByRole.get(role).splice(index, 1);
        renderFiles(role);
      });
      pill.append(label, remove);
      list.append(pill);
    });
    slot.classList.toggle('complete', filesByRole.get(role).length > 0);
    updateReadiness();
  }

  function addFiles(role, selected) {
    if (busy) return;
    message.textContent = '';
    for (const file of selected) {
      const acceptable = ['application/pdf','image/png','image/jpeg'].includes(file.type) || /\.(pdf|png|jpe?g)$/i.test(file.name);
      if (!acceptable) return showError(`${file.name} is not a PDF, PNG, or JPEG.`);
      if (!file.size) return showError(`${file.name} is empty.`);
      if (file.size > MAX_FILE_BYTES) return showError(`${file.name} is larger than the 250 MB per-file limit.`);
    }
    const prospective = [...totalFiles(), ...selected];
    if (prospective.length > MAX_FILE_COUNT) return showError(`A review may contain no more than ${MAX_FILE_COUNT} files.`);
    if (prospective.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return showError('The complete upload must be 500 MB or smaller.');
    filesByRole.get(role).push(...selected);
    renderFiles(role);
  }

  for (const slot of document.querySelectorAll('.document-slot')) {
    const role = slot.dataset.role;
    const input = slot.querySelector('input[type=file]');
    input.addEventListener('change', () => { addFiles(role, [...input.files]); input.value = ''; });
    for (const eventName of ['dragenter','dragover']) slot.addEventListener(eventName, event => { event.preventDefault(); slot.classList.add('dragging'); });
    for (const eventName of ['dragleave','drop']) slot.addEventListener(eventName, event => { event.preventDefault(); slot.classList.remove('dragging'); });
    slot.addEventListener('drop', event => addFiles(role, [...event.dataTransfer.files]));
  }

  function updateReadiness() {
    const emailReady = form.elements.email.validity.valid && Boolean(form.elements.email.value.trim());
    const requestReady = Boolean(form.elements.reviewRequest.value.trim());
    const authorized = form.elements.authorized.checked;
    const completed = [emailReady, requestReady, authorized].filter(Boolean).length;
    const ready = completed === 3 && !busy;
    submitPanel.classList.toggle('ready', ready);
    document.querySelector('#readiness-meter').style.width = `${Math.round(completed / 3 * 100)}%`;
    document.querySelector('#readiness-title').textContent = ready ? 'Ready to submit' : !emailReady ? 'Add a valid reply email' : !requestReady ? 'Describe what you need reviewed' : 'Confirm file authorization';
    document.querySelector('#readiness-copy').textContent = `${totalFiles().length} file${totalFiles().length === 1 ? '' : 's'} selected. Files and project details are optional.`;
    submitButton.disabled = busy;
    submitButton.querySelector('span').textContent = busy ? 'Submitting review…' : 'Submit review request';
  }

  function payload() {
    const data = new FormData(form);
    const service = data.get('reviewService') === 'site-compliance' ? 'Site Compliance Review ($199 base; travel by custom quote)' : 'Submittal Technical Review ($99)';
    const options = [
      data.has('pipeVerification') ? 'Measured isometric pipe verification quote requested' : null,
      data.has('repairIsometric') ? 'Separate proposed repair isometric and tagged parts-list quote requested' : null
    ].filter(Boolean);
    const reviewRequest = [`Service requested: ${service}`, `Optional scope: ${options.join('; ') || 'None requested'}`, '', data.get('reviewRequest')].join('\n');
    return {
      email:data.get('email'), contactName:data.get('contactName'), companyName:data.get('companyName'), phone:data.get('phone'),
      reviewRequest, projectName:data.get('projectName'), reviewingAuthority:data.get('reviewingAuthority'),
      manufacturer:data.get('manufacturer'), addressLine1:data.get('addressLine1'), city:data.get('city'), state:data.get('state'),
      postalCode:data.get('postalCode'), website:data.get('website')
    };
  }

  async function jsonRequest(url, options) {
    const response = await fetch(url, { credentials:'omit', ...options });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The server could not complete this request.');
    return result;
  }

  function uploadFile(url, file, onProgress) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', url);
      request.setRequestHeader('Content-Type', 'application/octet-stream');
      request.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
      request.upload.addEventListener('progress', event => { if (event.lengthComputable) onProgress(event.loaded); });
      request.addEventListener('load', () => {
        let result = {};
        try { result = JSON.parse(request.responseText || '{}'); } catch {}
        if (request.status >= 200 && request.status < 300) resolve(result);
        else reject(new Error(result.error || `Upload failed for ${file.name}.`));
      });
      request.addEventListener('error', () => reject(new Error(`Network error while uploading ${file.name}.`)));
      request.send(file);
    });
  }

  function setProgress(label, completedBytes, totalBytes) {
    const percent = totalBytes ? Math.min(100, Math.round(completedBytes / totalBytes * 100)) : 0;
    progress.hidden = false;
    progressLabel.textContent = label;
    progressPercent.textContent = `${percent}%`;
    progressMeter.value = percent;
  }

  form.addEventListener('input', event => { event.target.classList?.remove('invalid'); updateReadiness(); });
  form.addEventListener('change', () => { updateReadiness(); updateServiceSummary(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!form.checkValidity()) {
      for (const field of form.querySelectorAll(':invalid')) field.classList.add('invalid');
      form.reportValidity();
      return showError('Enter a valid email, describe the review, and confirm file authorization.');
    }
    const requestPayload = payload();
    busy = true;
    form.setAttribute('aria-busy', 'true');
    for (const control of form.querySelectorAll('input,textarea,select,button')) control.disabled = true;
    message.textContent = '';
    updateReadiness();
    try {
      setProgress('Creating secure EngineCore intake…', 0, 1);
      const created = await jsonRequest(API, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(requestPayload) });
      if (!created.token) throw new Error('The review intake could not be opened. Please refresh and try again.');
      const uploads = roles.flatMap(role => filesByRole.get(role).map(file => ({ role, file })));
      const totalBytes = uploads.reduce((sum, item) => sum + item.file.size, 0);
      let completedBytes = 0;
      for (let index = 0; index < uploads.length; index += 1) {
        const item = uploads[index];
        setProgress(`Uploading ${index + 1} of ${uploads.length}: ${item.file.name}`, completedBytes, totalBytes);
        await uploadFile(`${API}/${encodeURIComponent(created.token)}/files/${item.role}`, item.file, loaded => setProgress(`Uploading ${index + 1} of ${uploads.length}: ${item.file.name}`, completedBytes + loaded, totalBytes));
        completedBytes += item.file.size;
      }
      setProgress('Filing your review request…', totalBytes || 1, totalBytes || 1);
      const result = await jsonRequest(`${API}/${encodeURIComponent(created.token)}/finalize`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ authorized:true }) });
      complete = true;
      document.querySelector('#intake-main').hidden = true;
      document.querySelector('.intake-aside').hidden = true;
      document.querySelector('#success-reference').textContent = result.reference || created.reference;
      const success = document.querySelector('#success-panel');
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ behavior:'smooth', block:'start' });
    } catch (error) {
      showError(error.message);
      progress.hidden = true;
      for (const control of form.querySelectorAll('input,textarea,select,button')) control.disabled = false;
      submitPanel.scrollIntoView({ behavior:'smooth', block:'center' });
    } finally {
      busy = false;
      form.removeAttribute('aria-busy');
      updateReadiness();
    }
  });

  document.querySelector('#start-another').addEventListener('click', () => window.location.reload());
  window.addEventListener('beforeunload', event => {
    if (!complete && totalFiles().length) { event.preventDefault(); event.returnValue = ''; }
  });
  updateServiceSummary();
  updateReadiness();
})();
