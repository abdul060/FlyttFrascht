/* Flytt & Fräscht – samma befintliga offertformulär i en dialog.
   Inga duplicerade formulär, ingen ny datalagring och inga nya API-anrop. */
(function () {
  'use strict';
  const dialog = document.getElementById('ff-fast-quote-dialog');
  const section = document.getElementById('offert');
  const slot = document.getElementById('ff-fast-quote-slot');
  const close = document.getElementById('ff-fast-quote-close');
  if (!dialog || !section || !slot || !close || typeof dialog.showModal !== 'function') return;
  const originalParent = section.parentNode;
  const originalAfter = section.nextSibling;
  let opener = null;

  function openQuote(ev) {
    if (dialog.open) return;
    if (ev) ev.preventDefault();
    opener = ev && ev.currentTarget && typeof ev.currentTarget.focus === 'function' ? ev.currentTarget : null;
    slot.appendChild(section); // Flyttar ORIGINALFORMULÄRET, kopierar det aldrig.
    try { dialog.showModal(); }
    catch (_) { originalParent.insertBefore(section,originalAfter); location.hash='offert'; return; }
    close.focus({preventScroll:true});
  }
  function closeQuote() { if (dialog.open) dialog.close(); }
  function restore() {
    originalParent.insertBefore(section, originalAfter);
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
    opener = null;
  }
  document.querySelectorAll('a[href="#offert"]').forEach(link => {
    link.addEventListener('click', openQuote);
  });
  close.addEventListener('click', closeQuote);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeQuote(); });
  dialog.addEventListener('close', restore);
  // Visa frivilliga tjänstedetaljer bara när minst ett relevant fält finns.
  const serviceExtras = document.getElementById('ff-service-extras');
  const form = document.getElementById('f');
  function syncOptionalVisibility() {
    if (!serviceExtras) return;
    const available = Array.from(serviceExtras.querySelectorAll('fieldset')).some(field => !field.hidden);
    serviceExtras.hidden = !available;
    if (!available) serviceExtras.open = false;
  }
  if (form) {
    form.addEventListener('change', syncOptionalVisibility);
    syncOptionalVisibility();
  }
  // Vid lyckad offert stängs bara snabbvyn. Den befintliga tackdialogen behålls.
  const success = document.getElementById('res');
  if (success && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      if (success.classList.contains('on') && dialog.open) closeQuote();
    }).observe(success,{attributes:true,attributeFilter:['class']});
  }
})();
