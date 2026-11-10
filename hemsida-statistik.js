/* Flytt & Fräscht – cookiefri, anonym räkning av sidvisningar och offertsteg.
   Inga personuppgifter, unika ID:n eller formulärfält skickas. */
(function () {
  'use strict';
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  const cfg = window.FLYTT_CONFIG || {};
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl || '')) return;
  const endpoint = cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/webbstatistik';
  const sent = new Set();
  let selectedService = 'okand';
  function service() {
    const select = document.getElementById('s');
    const text = String(select?.value || '').toLocaleLowerCase('sv-SE');
    if (/kombin|paket|flera/.test(text)) return 'paket';
    if (/fönster|fonster/.test(text)) return 'fonster';
    if (/bär|barhjalp/.test(text)) return 'bar';
    if (/städ|stad/.test(text)) return 'stad';
    if (/flytt|transport/.test(text)) return 'flytt';
    return text ? 'annat' : 'okand';
  }
  function emit(event, svc) {
    const key = event;
    if (sent.has(key)) return;
    sent.add(key);
    const data = JSON.stringify({ event: event, service: svc || 'okand' });
    try {
      fetch(endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabaseAnonKey },
        body: data,
      }).catch(() => {});
    } catch (_) { /* Best effort; do not affect user flow. */ }
  }
  emit('page_view', 'okand');
  const form = document.getElementById('f');
  if (!form) return;
  form.addEventListener('submit', function () { selectedService = service(); });
  form.addEventListener('focusin', function (e) {
    if (e.target && e.target.matches('input,select,textarea')) emit('quote_start', service());
  }, { passive: true });
  // The existing Formspree submit code adds .on to #res ONLY after HTTP success.
  const success = document.getElementById('res');
  if (success && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function () {
      if (success.classList.contains('on')) {
        emit('quote_sent', selectedService);
        observer.disconnect();
      }
    });
    observer.observe(success, { attributes: true, attributeFilter: ['class'] });
  }
})();
