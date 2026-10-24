'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../demo-request.js'), 'utf8');
const keys = ['semi_annual_forms', 'fe_forms', 'platinum_permit_packages', 'pipe_builder', 'drawing_studio', 'odek'];

function setup(fetchImpl) {
  const values = { contactName: ' Alex Example ', companyName: ' Example Company ', email: ' alex@example.com ', userCount: '2', additionalContext: ' Field drawings ', website: '' };
  const inputs = keys.map(value => ({ value, checked: false, validationMessage: '', setCustomValidity(text) { this.validationMessage = text; } }));
  const classes = new Set();
  const message = { textContent: '', classList: { add: value => classes.add(value), remove: value => classes.delete(value) } };
  const selected = { textContent: '' };
  const button = { textContent: 'Request a free demo', disabled: false };
  const handlers = {};
  let resets = 0;
  const form = {
    querySelector: () => button,
    querySelectorAll: () => inputs,
    addEventListener: (event, handler) => { handlers[event] = handler; },
    setAttribute() {}, removeAttribute() {},
    reportValidity: () => !inputs.some(input => input.validationMessage),
    reset() { resets++; inputs.forEach(input => { input.checked = false; }); }
  };
  const links = keys.map(key => ({ dataset: { demoTool: key }, addEventListener(event, handler) { this.handler = handler; } }));
  const document = {
    querySelector: selector => ({ '#tool-demo-form': form, '#demo-message': message, '#demo-selected-tool': selected })[selector],
    querySelectorAll: () => links
  };
  vm.runInNewContext(source, { document, fetch: fetchImpl, AbortSignal, TypeError, FormData: class { get(name) { return values[name]; } } });
  return { values, inputs, message, button, selected, links, classes, submit: () => handlers.submit({ preventDefault() {} }), change: () => handlers.change(), resetCount: () => resets };
}

test('the free-demo form requires a tool and a card clears that validation', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; return { ok: true, json: async () => ({ ok: true }) }; });
  await ui.submit();
  assert.equal(calls, 0);
  assert.match(ui.inputs[0].validationMessage, /Choose at least one tool/);
  ui.links[4].handler();
  assert.equal(ui.inputs[4].checked, true);
  assert.equal(ui.inputs[0].validationMessage, '');
  await ui.submit();
  assert.equal(calls, 1);
});

test('the demo request uses its own endpoint without account credentials or payment fields', async () => {
  let sent;
  const ui = setup(async (url, options) => { sent = { url, options }; return { ok: true, json: async () => ({ ok: true }) }; });
  ui.inputs[1].checked = true;
  await ui.submit();
  assert.equal(sent.url, 'https://workspace.enginecore.org/api/public/demo-interest');
  assert.equal(sent.options.credentials, 'omit');
  assert.equal(sent.options.method, 'POST');
  const data = JSON.parse(sent.options.body);
  assert.equal(data.email, 'alex@example.com');
  assert.equal(data.contactName, 'Alex Example');
  assert.equal(data.userCount, 2);
  assert.deepEqual(data.interests, ['fe_forms']);
  assert.equal(data.additionalContext, 'Field drawings');
  assert.equal('reviewRequest' in data, false);
  assert.equal(ui.resetCount(), 1);
  assert.equal(ui.classes.has('success'), true);
  assert.equal(ui.button.disabled, false);
});

test('a repeated click does not duplicate an in-flight request and a rejected request keeps entries', async () => {
  let resolve;
  let calls = 0;
  const ui = setup(() => { calls++; return new Promise(done => { resolve = done; }); });
  ui.inputs[3].checked = true;
  const first = ui.submit();
  await ui.submit();
  assert.equal(calls, 1);
  assert.equal(ui.button.disabled, true);
  resolve({ ok: false, json: async () => ({ error: 'Too many requests. Wait and try again.' }) });
  await first;
  assert.equal(ui.resetCount(), 0);
  assert.equal(ui.inputs[3].checked, true);
  assert.match(ui.message.textContent, /Too many requests/);
  assert.equal(ui.button.disabled, false);
});

test('a network failure preserves the request and gives a usable fallback', async () => {
  const ui = setup(async () => { throw new TypeError('Network failure'); });
  ui.inputs[5].checked = true;
  await ui.submit();
  assert.equal(ui.resetCount(), 0);
  assert.equal(ui.inputs[5].checked, true);
  assert.match(ui.message.textContent, /Your entries are still here/);
  assert.match(ui.message.textContent, /EngineCore dashboard/);
  assert.equal(ui.button.disabled, false);
});
