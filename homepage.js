'use strict';

const trades = new Map([
  ['hvac', 'HVAC'],
  ['electrical', 'Electrical'],
  ['plumbing', 'Plumbing'],
  ['sprinkler', 'Sprinkler'],
  ['fire-alarm', 'Fire Alarm']
]);
const tradeKey = new URLSearchParams(location.search).get('trade');
const trade = trades.get(tradeKey);

if (trade) {
  document.body.classList.add('trade-access');
  document.body.dataset.inquiry = tradeKey;
  document.title = trade + ' Tool Access | EngineCore';
  document.querySelector('#access-title').textContent = trade + ' tool access';
  document.querySelector('#access-copy').textContent = trade + ' is on the EngineCore roadmap. Sign in to see the tools your administrator has enabled for your account.';
  document.querySelector('#demo-eyebrow').textContent = 'No account needed';
  document.querySelector('#demo-title').textContent = 'Request a demo.';
  document.querySelector('#demo-copy').textContent = 'Tell us what your team needs. We can show you the tools available today and hear what would make EngineCore useful for your trade.';
}
