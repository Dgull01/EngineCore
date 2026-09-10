'use strict';
(() => {
  // Temporary public launch state; keep checkout dormant until services are ready.
  const comingSoon = true;
  if (comingSoon) {
    const form = document.getElementById('intake-form');
    const notice = document.createElement('p');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10000;padding:18px 28px;background:#142b3c;color:white;border:1px solid #f07845;border-radius:10px;box-shadow:0 8px 30px #0004;font:600 18px sans-serif;';
    notice.hidden = true;
    document.body.appendChild(notice);
    const showComingSoon = event => {
      event.preventDefault();
      const control = event.currentTarget;
      if (control !== form) control.textContent = 'Coming soon';
      notice.hidden = false;
      notice.textContent = 'Coming soon';
    };
    document.querySelectorAll('a[href="#intake"], #intake-form button[type="submit"], #retry-payment, #upload-files').forEach(control => {
      control.addEventListener('click', showComingSoon);
    });
    form.noValidate = true;
    form.addEventListener('submit', showComingSoon);
    return;
  }
  const API = 'https://workspace.enginecore.org/api/public/commercial-reviews';
  const form = document.getElementById('intake-form');
  const button = form.querySelector('[type=submit]');
  const errorBox = document.getElementById('form-error');
  const confirmation = document.getElementById('confirm');
  let busy = false;
  let token = null;
  const field = name => form.elements.namedItem(name)?.value.trim() || '';
  async function request(path, options = {}) {
    const response = await fetch(API + path, { credentials: 'omit', ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'The request could not be completed. Please try again.');
    return body;
  }
  function showError(error) { errorBox.textContent = error.message; errorBox.hidden = false; }
  function retain(value) { token = value; try { sessionStorage.setItem('enginecore-review-token', value); } catch {} }
  async function checkout() {
    const result = await request('/' + encodeURIComponent(token) + '/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    if (result.paid) return showStatus();
    const target = new URL(result.url);
    if (target.origin !== 'https://checkout.stripe.com') throw new Error('The payment address could not be verified.');
    window.location.assign(target.href);
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true; button.disabled = true; errorBox.hidden = true;
    button.textContent = 'Opening secure checkout…';
    try {
      // Reuse an in-flight request on a retry; a failed redirect must not create another charge.
      if (!token) {
        const result = await request('', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:field('email'),what:field('what'),project:field('project'),ahj:field('ahj'),manufacturer:field('manufacturer'),phone:field('phone'),website:field('website')}) });
        if (!result.token) throw new Error('Your review request could not be opened.');
        retain(result.token);
      }
      await checkout();
    } catch (error) { showError(error); }
    finally { busy=false; button.disabled=false; button.textContent='Continue to secure $99 payment'; }
  });
  async function showStatus() {
    form.hidden=true; confirmation.hidden=false;
    document.getElementById('payment-heading').textContent='Checking your payment';
    try {
      const result=await request('/'+encodeURIComponent(token));
      document.getElementById('confirm-ref').textContent=result.reference;
      document.getElementById('payment-status').textContent=result.paid?'Payment received':'Payment not completed';
      document.getElementById('payment-heading').textContent=result.paid?'Your $99 review is booked.':'Complete payment to book your review.';
      document.getElementById('payment-message').textContent=result.paid?'Your request is saved for David Gull. Upload the documents you want reviewed below. You keep the findings; preparation is a separate quote.':'Your request is saved, but it has not entered the paid review queue. You have not booked a review yet.';
      document.getElementById('paid-upload').hidden=!result.paid;
      document.getElementById('retry-payment').hidden=result.paid;
      confirmation.focus();
    } catch(error) {
      document.getElementById('payment-heading').textContent='We could not confirm the payment status yet.';
      document.getElementById('payment-message').textContent=error.message+' Refresh this page to check again; do not pay twice.';
    }
  }
  document.getElementById('retry-payment').addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try { await checkout(); } catch(error) { document.getElementById('payment-message').textContent=error.message; }
    finally { event.currentTarget.disabled=false; }
  });
  document.getElementById('upload-files').addEventListener('click',async event=>{
    const files=[...document.getElementById('review-files').files];
    const status=document.getElementById('upload-status');
    if (!files.length) {status.textContent='Choose at least one document.';return;}
    if (files.length>16||files.some(f=>!f.size||f.size>60*1024*1024)||files.reduce((n,f)=>n+f.size,0)>200*1024*1024) {status.textContent='Choose up to 16 files, 60 MB per file and 200 MB total.';return;}
    event.currentTarget.disabled=true;
    try {
      for(const [i,file] of files.entries()) {
        status.textContent=`Uploading ${i+1} of ${files.length}: ${file.name}`;
        await request('/'+encodeURIComponent(token)+'/files',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});
      }
      document.getElementById('review-files').value='';
      status.textContent='Your documents are saved with your commercial review request.';
    } catch(error) {status.textContent=error.message+' Files already uploaded remain saved. Retrying does not duplicate identical files.';}
    finally {event.currentTarget.disabled=false;}
  });
  const hash=new URLSearchParams(location.hash.slice(1));
  const returned=hash.get('review');
  request('/availability').then(result=>{
    if(!result.available&&!returned){button.disabled=true;button.textContent='Online reviews opening soon';errorBox.textContent='Paid reviews will open once secure checkout is ready.';errorBox.hidden=false;}
  }).catch(()=>{if(!returned){button.disabled=true;button.textContent='Checkout temporarily unavailable';errorBox.textContent='We cannot reach secure checkout right now. Please try again later.';errorBox.hidden=false;}});
  if (returned && /^[A-Za-z0-9_-]{64}$/.test(returned)) {
    retain(returned);
    history.replaceState(null,'',location.pathname+'#intake');
    showStatus();
  } else if(location.hash==='#intake') {
    try { const saved=sessionStorage.getItem('enginecore-review-token');if(saved&&/^[A-Za-z0-9_-]{64}$/.test(saved)){token=saved;showStatus();} } catch {}
  }
})();
