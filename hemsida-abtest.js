/* Flytt & Fräscht – enkelt, anonymt A/B-test av en offertknapp.
   Kräver Etapp 3 webbstatistik och SQL-/Edge-uppdateringen i detta paket.
   Inga cookies, inga identifierande händelser eller formulärvärden skickas. */
(function () {
  'use strict';
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  const cta = document.getElementById('ff-ab-hero-cta');
  const form = document.getElementById('f');
  if (!cta || !form) return;
  const cfg = window.FLYTT_CONFIG || {};
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl || '')) return;
  if (typeof cfg.supabaseAnonKey !== 'string' || !cfg.supabaseAnonKey) return;

  // Ett konsekvent alternativ under samma flik/session, utan användar-ID.
  const key = 'ff_cta_experiment_1';
  let variant;
  try { variant = sessionStorage.getItem(key); } catch (_) { /* privat läge */ }
  if (variant !== 'a' && variant !== 'b') {
    const n = new Uint32Array(1);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(n);
    else n[0] = Math.floor(Math.random() * 4294967296);
    variant = (n[0] % 2) === 0 ? 'a' : 'b';
    try { sessionStorage.setItem(key, variant); } catch (_) { /* privat läge */ }
  }
  cta.textContent = variant === 'a' ? 'Få offert på din flytt →' : 'Få en personlig offert →';
  const prefix = 'ab_' + variant + '_';
  const endpoint = cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/webbstatistik';
  const emitted = new Set();
  function emit(name) {
    if (emitted.has(name)) return;
    emitted.add(name);
    try {
      fetch(endpoint, {
        method:'POST', mode:'cors', credentials:'omit', keepalive:true,
        headers:{ 'Content-Type':'application/json', 'apikey':cfg.supabaseAnonKey },
        body:JSON.stringify({event:prefix+name, service:'okand'})
      }).catch(()=>{});
    } catch (_) { /* Webbplatsen fungerar även om statistiken blockeras. */ }
  }
  // Exponering = sidvisning där testknappen finns, INTE unik besökare.
  emit('view');
  // En påbörjad offert är första interaktionen med formuläret.
  form.addEventListener('focusin', (ev)=>{
    if (ev.target && ev.target.matches('input:not([type="hidden"]),select,textarea')) emit('start');
  }, {passive:true});
  form.addEventListener('change', ()=>emit('start'), {passive:true});
  // Registrera skickad offert först när befintlig kod visar lyckad bekräftelse.
  // Ett klick på knappen eller på granskningen räknas ALDRIG som skickat.
  const res = document.getElementById('res');
  if (res && typeof MutationObserver !== 'undefined') {
    const watcher = new MutationObserver(()=>{
      if (res.classList.contains('on')) { emit('sent'); watcher.disconnect(); }
    });
    watcher.observe(res,{attributes:true,attributeFilter:['class']});
  }
})();
