import { forms } from './field-forms-data.js';

const requested = new URLSearchParams(location.search).get('form');
const formId = Object.hasOwn(forms, requested) ? requested : 'alarm-quick';
const definition = forms[formId];
const storageKey = `enginecore.field-form.v1.${formId}`;
const form = document.querySelector('#field-form');
const status = document.querySelector('#field-status');
const progress = document.querySelector('#field-progress-text');
const clearButton = document.querySelector('#field-clear');
const confirmDialog = document.querySelector('#field-confirm');
const report = document.querySelector('#field-report');
const sections = new Map();
const groups = new Map();

const emptyDraft = () => ({ values: {}, repeats: {} });
let draft = emptyDraft();
let saved;
let storageReady = true;
let hasConflict = false;

function node(tag, value, className) {
  const element = document.createElement(tag);
  if (value) element.textContent = value;
  if (className) element.className = className;
  return element;
}

function loadDraft() {
  try {
    saved = localStorage.getItem(storageKey);
    const stored = JSON.parse(saved);
    if (stored?.values && stored.repeats) draft = stored;
  } catch {
    storageReady = false;
  }
}

function saveDraft({ clear = false } = {}) {
  if (hasConflict || !storageReady) return false;
  try {
    if (localStorage.getItem(storageKey) !== saved) {
      hasConflict = true;
      status.textContent = 'Draft changed in another tab. Export your entries before reloading.';
      return false;
    }
    if (clear) {
      localStorage.removeItem(storageKey);
      saved = null;
      status.textContent = 'Draft cleared.';
    } else {
      saved = JSON.stringify(draft);
      localStorage.setItem(storageKey, saved);
      status.textContent = 'Saved in this browser.';
    }
    return true;
  } catch {
    storageReady = false;
    status.textContent = 'Browser storage is unavailable. Export before closing this page.';
    return false;
  }
}

function valueAt(group, id) {
  return draft.values[`${group}.${id}`] ?? '';
}

function applies(group, field) {
  if (!field.when) return true;
  const parent = groups.get(group)?.find(({ id }) => id === field.when.field);
  return field.when.values.includes(valueAt(group, field.when.field)) && (!parent || applies(group, parent));
}

function updateValue(group, field, value) {
  const key = `${group}.${field.id}`;
  if (value === '') delete draft.values[key];
  else draft.values[key] = value;
  saveDraft();
  refreshProgress();
}

function selectControl(options, hint = 'Select…') {
  const control = node('select');
  control.add(new Option(hint, ''));
  for (const option of options) control.add(new Option(option, option));
  return control;
}

function buildField(group, field, onChange, context) {
  const wrapper = node('div', '', `field-control${field.type === 'textarea' ? ' field-control-wide' : ''}`);
  const label = node('label', field.unit ? `${field.label} (${field.unit})` : field.label);
  let control;
  let overflow;
  if (field.type === 'count') {
    const countOptions = Array.from({ length: 51 }, (_, count) => String(count));
    control = selectControl(countOptions, '—');
    if (field.id === 'tested') control.add(new Option('All installed', 'all'), 1);
    control.add(new Option('51 or more…', 'overflow'));
    overflow = node('input', '', 'field-count-custom');
    Object.assign(overflow, { type: 'number', inputMode: 'numeric', min: '51', step: '1', placeholder: '51 or more' });
    overflow.setAttribute('aria-label', `${context ? `${context} · ` : ''}${field.label}, 51 or more`);
    const count = valueAt(group, field.id);
    const useOverflow = Number(count) > 50;
    control.value = useOverflow ? 'overflow' : count;
    overflow.value = useOverflow ? count : '';
    overflow.hidden = !useOverflow;
    overflow.addEventListener('input', () => onChange(field, overflow.validity.valid ? overflow.value : ''));
    control.addEventListener('change', () => {
      if (control.value === 'all') {
        const installed = valueAt(group, 'installed');
        control.value = Number(installed) > 50 ? 'overflow' : installed;
        overflow.value = control.value === 'overflow' ? installed : '';
      } else {
        overflow.value = '';
      }
      overflow.hidden = control.value !== 'overflow';
      onChange(field, overflow.hidden ? control.value : overflow.value);
      if (!overflow.hidden && !overflow.value) overflow.focus();
    });
  } else {
    if (field.type === 'select') {
      control = selectControl(field.options);
    } else if (field.type === 'textarea') {
      control = node('textarea');
      control.rows = 2;
      control.maxLength = 3000;
    } else {
      control = node('input');
      control.type = field.type ?? 'text';
      if (field.type === 'number') control.step = 'any';
      if (control.type === 'text' || control.type === 'tel') control.maxLength = 240;
    }
    control.value = valueAt(group, field.id);
    if (field.placeholder) control.placeholder = field.placeholder;
    control.addEventListener('input', () => onChange(field, control.value));
  }
  control.id = `field-${group}-${field.id}`;
  label.htmlFor = control.id;
  if (context) control.setAttribute('aria-label', `${context} · ${label.textContent}`);
  wrapper.append(label, control);
  if (overflow) wrapper.append(overflow);
  return { field, wrapper, control };
}

function countIssue(group) {
  const installed = valueAt(group, 'installed');
  const tested = valueAt(group, 'tested');
  return installed !== '' && tested !== '' && Number(tested) > Number(installed);
}

function buildGroup(group, fields, context) {
  groups.set(group, fields);
  const countField = fields.some(({ id }) => id === 'installed') && fields.some(({ id }) => id === 'tested');
  const grid = node('div', '', countField ? 'field-grid field-grid-counts' : 'field-grid');
  const warning = node('p', 'Tested count is higher than installed count.', 'field-count-warning');
  warning.id = `field-warning-${group}`;
  warning.setAttribute('role', 'status');

  function refreshGroup() {
    for (const { field, wrapper, control } of entries) {
      wrapper.hidden = !applies(group, field);
      if (field.id === 'tested') {
        control.querySelector('option[value="all"]').disabled = valueAt(group, 'installed') === '';
        control.setAttribute('aria-invalid', String(countIssue(group)));
      }
    }
    warning.hidden = !countIssue(group);
  }

  const entries = fields.map((field) => buildField(group, field, (changed, value) => {
    updateValue(group, changed, value);
    refreshGroup();
  }, context));
  for (const { field, wrapper, control } of entries) {
    if (field.id === 'tested') control.setAttribute('aria-describedby', warning.id);
    grid.append(wrapper);
  }
  if (countField) grid.append(warning);
  refreshGroup();
  return grid;
}

function repeatIds(section) {
  return draft.repeats[section.id] ?? [];
}

function capitalized(value) {
  return value[0].toUpperCase() + value.slice(1);
}

function buildRepeat(section, body) {
  const list = node('div');
  const add = node('button', `+ Add ${section.repeat.label}`, 'field-add');
  add.type = 'button';

  function renderItems() {
    list.replaceChildren();
    repeatIds(section).forEach((id, index) => {
      const group = `${section.id}-${id}`;
      const title = `${capitalized(section.repeat.label)} ${index + 1}`;
      const row = node('div', '', 'field-repeat-item');
      const remove = node('button', 'Remove', 'field-remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${title}`);
      remove.addEventListener('click', () => {
        const keys = Object.keys(draft.values).filter((key) => key.startsWith(`${group}.`));
        if (keys.length && !window.confirm(`Remove ${title} and its entries?`)) return;
        for (const key of keys) delete draft.values[key];
        groups.delete(group);
        draft.repeats[section.id] = repeatIds(section).filter((item) => item !== id);
        saveDraft();
        renderItems();
        refreshProgress();
        add.focus();
      });
      row.append(node('h3', title), remove, buildGroup(group, section.repeat.fields, title));
      list.append(row);
    });
  }

  add.addEventListener('click', () => {
    const id = crypto.randomUUID();
    draft.repeats[section.id] = [...repeatIds(section), id];
    saveDraft();
    renderItems();
    refreshProgress();
    list.lastElementChild.querySelector('input, select, textarea').focus();
  });
  renderItems();
  body.append(list, add);
}

function renderForm() {
  sections.clear();
  groups.clear();
  form.replaceChildren();
  definition.sections.forEach((section, index) => {
    const details = node('details', '', 'field-section');
    const summary = node('summary', section.title);
    const body = node('div', '', 'field-section-body');
    details.open = index === 0;
    if (section.hint) body.append(node('p', section.hint, 'field-hint'));
    if (section.fields) body.append(buildGroup(section.id, section.fields));
    if (section.rows) {
      const list = node('div', '', 'field-row-grid');
      section.rows.labels.forEach((label, index) => {
        const row = node('div', '', 'field-row');
        row.append(node('h3', label), buildGroup(`${section.id}-row-${index}`, section.rows.fields, label));
        list.append(row);
      });
      body.append(list);
    }
    if (section.repeat) buildRepeat(section, body);
    details.append(summary, body);
    form.append(details);
    const summaryStatus = node('span', '', 'field-section-status');
    summary.append(summaryStatus);
    sections.set(section.id, summaryStatus);
  });
  refreshProgress();
}

function groupHasEntries(group, fields = []) {
  return fields.some((field) => applies(group, field) && valueAt(group, field.id).trim() !== '');
}

function refreshProgress() {
  let started = 0;
  for (const section of definition.sections) {
    const hasEntries = groupHasEntries(section.id, section.fields)
      || section.rows?.labels.some((_, index) => groupHasEntries(`${section.id}-row-${index}`, section.rows.fields))
      || repeatIds(section).some((id) => groupHasEntries(`${section.id}-${id}`, section.repeat.fields));
    if (hasEntries) started += 1;
    sections.get(section.id).textContent = hasEntries ? 'Started' : '';
  }
  progress.textContent = `${started} of ${definition.sections.length} sections started`;
  clearButton.disabled = !Object.keys(draft.values).length && !Object.values(draft.repeats).some((items) => items.length);
}

function reportValue(group, field) {
  const value = valueAt(group, field.id).trim();
  if (!value) return 'Not recorded';
  return field.unit ? `${value} ${field.unit}` : value;
}

function reportGroup(group, fields, { includeAll = false } = {}) {
  const list = node('dl', '', 'report-row');
  for (const field of fields) {
    if (!applies(group, field)) continue;
    const value = valueAt(group, field.id).trim();
    if (!value && !includeAll && !field.required && !field.when && !['select', 'count'].includes(field.type)) continue;
    const entry = node('div', '', field.type === 'textarea' ? 'report-long-entry' : '');
    entry.append(node('dt', field.label), node('dd', reportValue(group, field)));
    list.append(entry);
  }
  return list.children.length ? list : node('p', 'No entries recorded.');
}

function reportRows(section) {
  const table = node('table');
  const columns = section.rows.fields;
  const headings = node('tr');
  for (const label of ['Item', ...columns.map((field) => field.label)]) {
    const heading = node('th', label);
    heading.scope = 'col';
    headings.append(heading);
  }
  const header = node('thead');
  header.append(headings);
  const rows = node('tbody');
  section.rows.labels.forEach((label, index) => {
    const group = `${section.id}-row-${index}`;
    const row = node('tr');
    const heading = node('th', label);
    heading.scope = 'row';
    row.append(heading);
    for (const field of columns) {
      const value = applies(group, field) ? reportValue(group, field) : '—';
      const cell = node('td', value);
      if (field.id === 'tested' && countIssue(group)) cell.append(node('p', 'Review count'));
      row.append(cell);
    }
    rows.append(row);
  });
  table.append(header, rows);
  return table;
}

function prepareReport() {
  report.replaceChildren(node('p', 'ENGINECORE · FIELD TRIAL DRAFT', 'report-kicker'), node('h1', definition.title));
  if (formId === 'alarm-nfpa') {
    report.append(node('p', 'Confirm the adopted NFPA 72 edition and local reporting requirements before official use.'));
  }
  for (const section of definition.sections) {
    const block = node('section', '', 'report-section');
    block.append(node('h2', section.title));
    if (section.fields) block.append(reportGroup(section.id, section.fields));
    if (section.rows) block.append(reportRows(section));
    if (section.repeat) {
      const items = repeatIds(section).filter((id) => groupHasEntries(`${section.id}-${id}`, section.repeat.fields));
      items.forEach((id, index) => {
        const group = `${section.id}-${id}`;
        block.append(node('h3', `${capitalized(section.repeat.label)} ${index + 1}`),
          reportGroup(group, section.repeat.fields, { includeAll: true }));
        if (countIssue(group)) block.append(node('p', 'Review: tested count is higher than installed count.'));
      });
      if (!items.length) block.append(node('p', 'No entries recorded.'));
    }
    report.append(block);
  }
  if (definition.sources?.length) {
    report.append(node('h2', 'References'), sourceLinks());
  }
}

function sourceLinks() {
  const list = node('ul');
  for (const [title, url] of definition.sources) {
    const item = node('li');
    const link = node('a', title);
    link.href = url;
    item.append(link);
    list.append(item);
  }
  return list;
}

async function enableOffline() {
  const message = document.querySelector('#field-offline');
  message.textContent = 'Keep this page open if you lose your connection.';
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./field-forms-sw.js', { scope: './field-forms.html' });
    await navigator.serviceWorker.ready;
    message.textContent = 'Forms available offline on this browser.';
  } catch {}
}

loadDraft();
document.title = `${definition.title} | EngineCore`;
document.querySelector('#field-title').textContent = definition.title;
document.querySelector('#field-description').textContent = definition.subtitle;
const activeAlarmTab = document.querySelector(`.field-nav [data-form="${formId}"]`);
const back = document.querySelector('#field-back');
if (activeAlarmTab) {
  activeAlarmTab.setAttribute('aria-current', 'page');
  activeAlarmTab.closest('nav').hidden = false;
  back.href = './fire-alarm.html';
  back.textContent = 'Back to Fire Alarm';
} else if (formId === 'hvac-pm') {
  back.href = './hvac.html';
  back.textContent = 'Back to HVAC';
}
document.querySelector('.field-progress').hidden = false;
document.querySelector('.field-actions').hidden = false;
status.textContent = !storageReady
  ? 'Browser storage is unavailable. Export before closing this page.'
  : saved ? 'Draft loaded from this browser.' : 'Changes save in this browser.';
if (definition.sources?.length) {
  const sources = document.querySelector('#field-sources');
  sources.replaceChildren(...sourceLinks().children);
  sources.hidden = false;
}
renderForm();
enableOffline();

form.addEventListener('submit', (event) => event.preventDefault());
clearButton.addEventListener('click', () => {
  confirmDialog.returnValue = '';
  confirmDialog.showModal();
});
confirmDialog.addEventListener('close', () => {
  if (confirmDialog.returnValue !== 'clear') return;
  if (storageReady && !saveDraft({ clear: true })) return;
  draft = emptyDraft();
  renderForm();
  document.querySelector('#field-title').scrollIntoView();
});
document.querySelector('#field-export').addEventListener('click', () => {
  prepareReport();
  window.print();
});
window.addEventListener('beforeprint', prepareReport);
